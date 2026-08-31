import 'dotenv/config';
import express from "express";
import cors from "cors";
import axios from "axios";
import { getSupabaseClient } from "./storage/database/supabase-client.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const supabase = getSupabaseClient();

// Amap API key (set via environment variable)
const AMAP_KEY = process.env.AMAP_API_KEY || '';

// ============ Health Check ============
app.get('/api/v1/health', (_req, res) => {
  console.log('Health check success');
  res.setHeader('X-Build-Marker', 'v-new-20260831');
  res.status(200).json({ status: 'ok' });
});

// ============ User Routes ============

// POST /api/v1/users - Register or get user by device_id
app.post('/api/v1/users', async (req, res) => {
  try {
    const { device_id, nickname } = req.body as { device_id: string; nickname?: string };
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    // Check if user exists
    const { data: existing, error: queryErr } = await supabase
      .from('users')
      .select('id, device_id, nickname, avatar_url, created_at')
      .eq('device_id', device_id)
      .maybeSingle();
    if (queryErr) throw new Error(`Query failed: ${queryErr.message}`);

    if (existing) {
      return res.json(existing);
    }

    // Create new user
    const { data: user, error: insertErr } = await supabase
      .from('users')
      .insert({
        device_id,
        nickname: nickname || '咖啡爱好者',
      })
      .select('id, device_id, nickname, avatar_url, created_at')
      .single();
    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    res.status(201).json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('POST /api/v1/users error:', message);
    res.status(500).json({ error: message });
  }
});

// PUT /api/v1/users/:id - Update user profile
app.put('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, avatar_url } = req.body as { nickname?: string; avatar_url?: string };

    const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, device_id, nickname, avatar_url, created_at')
      .single();
    if (error) throw new Error(`Update failed: ${error.message}`);

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('PUT /api/v1/users/:id error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/v1/users/stats/:userId - Get user stats
app.get('/api/v1/users/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { count: wishlistCount, error: wErr } = await supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (wErr) throw new Error(`Query failed: ${wErr.message}`);

    const { count: checkinCount, error: cErr } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (cErr) throw new Error(`Query failed: ${cErr.message}`);

    res.json({
      wishlist_count: wishlistCount || 0,
      checkin_count: checkinCount || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/users/stats/:userId error:', message);
    res.status(500).json({ error: message });
  }
});

// ============ Nearby Shops Route (Amap API) ============

interface AmapPoi {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  tel: string;
  rating: string;
  biz_ext: { rating?: string; cost?: string };
  distance: string;
  photos: { title: string; url: string }[];
}

app.get('/api/v1/shops/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = '3000', keywords, category = 'coffee' } = req.query as Record<string, string>;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const isBrunch = category === 'brunch';

    if (!AMAP_KEY) {
      // Return demo data when no API key configured
      const demoShops = getDemoShops(parseFloat(latitude), parseFloat(longitude), isBrunch);
      return res.json(demoShops);
    }

    // Category-specific search config (Amap POI type codes):
    // coffee: 咖啡厅 (050500/050501/050502/050600)
    // brunch: 外国餐厅/西餐厅/糕饼店/甜品店/面包房 (050200/050201/050205/050800/050900/050600)
    const effectiveKeywords = keywords !== undefined ? keywords : isBrunch ? '' : '咖啡';
    const types = isBrunch
      ? '050200|050201|050205|050800|050900|050600'
      : '050500|050501|050502|050600';

    const response = await axios.get('https://restapi.amap.com/v3/place/around', {
      params: {
        key: AMAP_KEY,
        location: `${longitude},${latitude}`,
        ...(effectiveKeywords ? { keywords: effectiveKeywords } : {}),
        types,
        radius,
        offset: 25,
        page: 1,
        extensions: 'all',
        sortrule: 'distance',
      },
    });

    if (response.data.status !== '1') {
      throw new Error(`Amap API error: ${response.data.info}`);
    }

    const shops = (response.data.pois || []).map((poi: AmapPoi) => {
      const [lng, lat] = poi.location.split(',').map(Number);
      return {
        poi_id: poi.id,
        name: poi.name,
        address: poi.address || '暂无地址',
        phone: poi.tel || '',
        rating: parseFloat(poi.biz_ext?.rating || poi.rating || '0') || 0,
        latitude: lat,
        longitude: lng,
        distance: poi.distance,
        type: poi.type,
        // Normalize AMap photo objects ({title,url}) into plain URL strings,
        // consistent with the /shops/search response format
        photos: (poi.photos || []).map((ph: any) => ph?.url).filter(Boolean).slice(0, 3),
        cost: parseCost(poi.biz_ext?.cost),
      };
    });

    // Sort: rating (desc) | distance (asc) | cost (asc, unknown last)
    const sortMode = (req.query.sort as string) || 'distance';
    const sorted = [...shops].sort((a: any, b: any) => {
      if (sortMode === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortMode === 'cost') {
        if (a.cost == null) return 1;
        if (b.cost == null) return -1;
        return a.cost - b.cost;
      }
      return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
    });

    res.json(sorted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/shops/nearby error:', message);
    res.status(500).json({ error: message });
  }
});

// ============ Wishlist Routes ============

// GET /api/v1/shops/search - Search shops worldwide by name
// Hybrid sources: AMap text search (full mainland-China POI coverage)
// + Photon/OpenStreetMap (worldwide coverage outside China)
app.get('/api/v1/shops/search', async (req, res) => {
  try {
    const keyword = (req.query.keyword as string || '').trim();
    if (!keyword) {
      return res.json([]);
    }

    // Optional user location for distance calculation & sorting
    const userLat = parseFloat(req.query.latitude as string);
    const userLon = parseFloat(req.query.longitude as string);
    const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLon);

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const POI_KEYS = new Set(['amenity', 'shop', 'tourism', 'leisure']);
    const CAFE_VALUES = new Set(['cafe', 'coffee_shop', 'deli;coffee_shop', 'coffee_roaster', 'bakery', 'pastry']);
    // Match both OSM english values and AMap chinese category strings
    const isCafeType = (type: string) =>
      CAFE_VALUES.has(type) || /咖啡|coffee|烘焙|面包|bakery|pastry/i.test(type);

    interface ShopResult {
      poi_id: string;
      name: string;
      address: string;
      phone: string;
      rating: number;
      latitude: number;
      longitude: number;
      distance: string | number;
      type: string;
      photos: string[];
      cost: number | null;
    }

    // Source 1: AMap text search — full coverage of mainland China
    // Single AMap text query, mapped to ShopResult list.
    const amapQuery = async (kw: string): Promise<ShopResult[]> => {
      if (!AMAP_KEY) return [];
      const params: Record<string, unknown> = {
        keywords: kw,
        key: AMAP_KEY,
        offset: 25,
        extensions: 'all',
      };
      if (hasUserLocation) {
        params.location = `${userLon},${userLat}`;
        params.sortrule = 'distance';
      }
      const resp = await axios.get('https://restapi.amap.com/v3/place/text', { params, timeout: 10000 });
      const pois = resp.data?.pois || [];
      return pois
        .filter((p: any) => p?.name)
        .map((p: any) => {
          const [lng, lat] = String(p.location || '').split(',').map(Number);
          return {
            poi_id: `amap_${p.id}`,
            name: p.name,
            address: [p.pname, p.cityname, p.adname, p.address].filter(Boolean).join(''),
            phone: p.tel || '',
            rating: 0,
            latitude: Number.isFinite(lat) ? lat : 0,
            longitude: Number.isFinite(lng) ? lng : 0,
            // AMap text API returns no usable distance field ([] placeholder),
            // so compute it ourselves the same way as Photon results
            distance:
              hasUserLocation && Number.isFinite(lat) && Number.isFinite(lng)
                ? Math.round(haversine(userLat, userLon, lat, lng))
                : '',
            type: p.type || '',
            photos: (p.photos || []).map((ph: any) => ph?.url).filter(Boolean).slice(0, 3),
            cost: p.biz_ext?.cost ? parseFloat(p.biz_ext.cost) : null,
          };
        });
    };

    // "bluebottle" -> "blue bottle": when the raw keyword is a single lowercase
    // word and AMap returns too few results, retry with split variants
    // (insert a space at candidate positions). Lets typo-style queries like
    // "bluebottle" / "mannercoffee" still hit brand POIs.
    const splitVariants = (kw: string): string[] => {
      if (!/^[a-zA-Z]{7,20}$/.test(kw)) return [];
      const variants: string[] = [];
      for (let i = 3; i <= Math.min(kw.length - 3, 6); i++) {
        variants.push(`${kw.slice(0, i)} ${kw.slice(i)}`);
      }
      return variants.slice(0, 4);
    };

    const fetchAmap = async (): Promise<ShopResult[]> => {
      const primary = await amapQuery(keyword);
      if (primary.length >= 5) return primary;
      const variants = splitVariants(keyword);
      if (!variants.length) return primary;
      const extra = await Promise.allSettled(variants.map((v) => amapQuery(v)));
      const merged = [...primary];
      const seenIds = new Set(primary.map((s) => s.poi_id));
      for (const r of extra) {
        if (r.status !== 'fulfilled') continue;
        for (const s of r.value) {
          if (!seenIds.has(s.poi_id)) {
            seenIds.add(s.poi_id);
            merged.push(s);
          }
        }
      }
      return merged;
    };

    // Source 2: Photon/OpenStreetMap — worldwide coverage outside China
    const fetchPhoton = async (): Promise<ShopResult[]> => {
      const response = await axios.get('https://photon.komoot.io/api', {
        params: { q: keyword, limit: 30, lang: 'en' },
        timeout: 10000,
        headers: {
          'User-Agent': 'CoffeeExplorer/1.0 (+https://www.nookcoffeenearby.top)',
        },
      });
      interface PhotonFeature {
        properties: Record<string, unknown>;
        geometry: { coordinates: [number, number] };
      }
      const seen = new Set<string>();
      return (response.data.features as PhotonFeature[])
        .filter((f) => {
          const props = f.properties;
          if (!props?.name) return false;
          if (!POI_KEYS.has(String(props.osm_key))) return false;
          const id = `${props.osm_type}${props.osm_id}`;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((f) => {
          const props = f.properties;
          const addressParts = [
            props.housenumber, props.street, props.district, props.city, props.state, props.country,
          ].filter((p): p is string => typeof p === 'string' && p.length > 0);
          const [lon, lat] = f.geometry.coordinates;
          return {
            poi_id: `osm_${props.osm_type}${props.osm_id}`,
            name: String(props.name),
            address: addressParts.join(', '),
            phone: '',
            rating: 0,
            latitude: lat,
            longitude: lon,
            distance: hasUserLocation ? Math.round(haversine(userLat, userLon, lat, lon)) : '',
            type: String(props.osm_value || props.osm_key || 'shop'),
            photos: [],
            cost: null,
          };
        });
    };

    // Photo enrichment: overseas (Photon/OSM) shops carry no photos. When a
    // GOOGLE_PLACES_API_KEY is configured, look up matching places via
    // Places API (New) text search with location bias and use their user
    // photos. Silently no-op without a key so search never depends on it.
    const enrichGooglePhotos = async (shops: ShopResult[]): Promise<{ shops: ShopResult[]; error: string | null }> => {
      const gKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!gKey) return shops;
      const targets = shops
        .filter((s) => s.poi_id.startsWith('osm_') && !s.photos.length && s.latitude && s.longitude)
        .slice(0, 8);
      if (!targets.length) return shops;
      const lookups = await Promise.allSettled(
        targets.map(async (shop) => {
          const resp = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            {
              textQuery: shop.name,
              maxResultCount: 1,
              locationBias: {
                circle: { center: { latitude: shop.latitude, longitude: shop.longitude }, radius: 2000 },
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': gKey,
                'X-Goog-FieldMask': 'places.photos',
              },
              timeout: 8000,
            },
          );
          const photos = resp.data?.places?.[0]?.photos || [];
          const photoName: string = photos[0]?.name || '';
          // media endpoint redirects to the actual image bytes; RN Image follows it
          const url = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=600&key=${gKey}`
            : '';
          return { poi_id: shop.poi_id, photos: url ? [url] : [] };
        }),
      );
      const photoMap = new Map<string, string[]>();
      let firstError: string | null = null;
      for (const r of lookups) {
        if (r.status === 'fulfilled') {
          if (r.value.photos.length) photoMap.set(r.value.poi_id, r.value.photos);
        } else if (!firstError) {
          const reason: any = r.reason;
          firstError = reason?.response?.data
            ? JSON.stringify(reason.response.data).slice(0, 150)
            : String(reason?.message || reason).slice(0, 150);
        }
      }
      return {
        shops: shops.map((s) => (photoMap.has(s.poi_id) ? { ...s, photos: photoMap.get(s.poi_id)! } : s)),
        error: firstError,
      };
    };

    // Run both sources in parallel; one failing shouldn't break the other
    const [amapRes, photonRes] = await Promise.allSettled([fetchAmap(), fetchPhoton()]);
    const amapShops = amapRes.status === 'fulfilled' ? amapRes.value : [];
    if (amapRes.status === 'rejected') console.error('AMap search failed:', amapRes.reason?.message);
    const photonShops = photonRes.status === 'fulfilled' ? photonRes.value : [];
    if (photonRes.status === 'rejected') console.error('Photon search failed:', photonRes.reason?.message);
    let googleError: string | null = null;
    let enrichedPhotonShops: ShopResult[] = photonShops;
    try {
      const enrichment = await enrichGooglePhotos(photonShops);
      enrichedPhotonShops = enrichment.shops;
      googleError = enrichment.error;
    } catch (e: unknown) {
      googleError = String(e instanceof Error ? e.message : e).slice(0, 150);
    }
    const googleEnriched = enrichedPhotonShops.filter((s) => s.poi_id.startsWith('osm_') && s.photos.length).length;

    // Cafe-related results first, then others; within each group, nearest first
    const results = [...amapShops, ...enrichedPhotonShops].sort((a, b) => {
      const aCafe = isCafeType(a.type) ? 0 : 1;
      const bCafe = isCafeType(b.type) ? 0 : 1;
      if (aCafe !== bCafe) return aCafe - bCafe;
      if (hasUserLocation) {
        const da = a.distance === '' ? Infinity : Number(a.distance);
        const db = b.distance === '' ? Infinity : Number(b.distance);
        return da - db;
      }
      return 0;
    });

    const debugInfo = {
      amap_key: AMAP_KEY ? 'configured' : 'missing',
      amap_error: amapRes.status === 'rejected' ? String(amapRes.reason?.message || amapRes.reason).slice(0, 200) : null,
      photon_error: photonRes.status === 'rejected' ? String(photonRes.reason?.message || photonRes.reason).slice(0, 200) : null,
      amap_count: amapShops.length,
      photon_count: photonShops.length,
      google_key: process.env.GOOGLE_PLACES_API_KEY ? 'configured' : 'missing',
      google_error: googleError,
      google_enriched: googleEnriched,
    };
    res.setHeader('X-Search-Debug', JSON.stringify(debugInfo));
    res.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/shops/search error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/v1/wishlists/check - Check if a shop is already in user's wishlist
app.get('/api/v1/wishlists/check', async (req, res) => {
  try {
    const { userId, poiId } = req.query as Record<string, string>;
    if (!userId || !poiId) {
      return res.status(400).json({ error: 'userId and poiId are required' });
    }

    const { data, error } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('shop_poi_id', poiId)
      .maybeSingle();
    if (error) throw new Error(`Query failed: ${error.message}`);

    res.json({ inWishlist: !!data, id: data?.id ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/wishlists/check error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/v1/wishlists/:userId - Get user's wishlist
app.get('/api/v1/wishlists/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('wishlists')
      .select('id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Query failed: ${error.message}`);

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/wishlists/:userId error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/v1/wishlists - Add to wishlist
app.post('/api/v1/wishlists', async (req, res) => {
  try {
    const { user_id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, shop_photos, note } = req.body;

    if (!user_id || !shop_name || !shop_address || !shop_latitude || !shop_longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent duplicates: same user + same shop
    if (shop_poi_id) {
      const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user_id)
        .eq('shop_poi_id', shop_poi_id)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Already in wishlist', id: existing.id });
      }
    }

    const { data, error } = await supabase
      .from('wishlists')
      .insert({ user_id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, shop_photos: shop_photos ? JSON.stringify(shop_photos) : '[]', note })
      .select()
      .single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('POST /api/v1/wishlists error:', message);
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v1/wishlists/:id - Remove from wishlist
app.delete('/api/v1/wishlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Delete failed: ${error.message}`);

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('DELETE /api/v1/wishlists/:id error:', message);
    res.status(500).json({ error: message });
  }
});

// ============ Check-in Routes ============

// GET /api/v1/checkins/:userId - Get user's check-ins
app.get('/api/v1/checkins/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('checkins')
      .select('id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, note, photo_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Query failed: ${error.message}`);

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/checkins/:userId error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/v1/checkins - Add check-in
app.post('/api/v1/checkins', async (req, res) => {
  try {
    const { user_id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, shop_photos, note, photo_url } = req.body;

    if (!user_id || !shop_name || !shop_address || !shop_latitude || !shop_longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('checkins')
      .insert({ user_id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, shop_photos: shop_photos ? JSON.stringify(shop_photos) : '[]', note, photo_url })
      .select()
      .single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('POST /api/v1/checkins error:', message);
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v1/checkins/:id - Remove check-in
app.delete('/api/v1/checkins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Delete failed: ${error.message}`);

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('DELETE /api/v1/checkins/:id error:', message);
    res.status(500).json({ error: message });
  }
});

// ============ Travel Plan Route ============

// GET /api/v1/travel-plan - Generate a travel plan based on user's wishlists and location
app.get('/api/v1/travel-plan', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.query as Record<string, string>;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user's wishlist
    const { data: wishlists, error } = await supabase
      .from('wishlists')
      .select('id, shop_name, shop_address, shop_phone, shop_rating, shop_latitude, shop_longitude, shop_poi_id, note')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Query failed: ${error.message}`);

    if (!wishlists || wishlists.length === 0) {
      return res.json({ shops: [], total_distance: '0', message: '还没有想去的咖啡店，先去探索添加吧！' });
    }

    // Calculate distances and sort by distance from user's current location
    const userLat = parseFloat(latitude || '0');
    const userLng = parseFloat(longitude || '0');

    const shopsWithDistance = wishlists.map(shop => {
      const distance = userLat && userLng
        ? calculateDistance(userLat, userLng, shop.shop_latitude, shop.shop_longitude)
        : 0;
      return { ...shop, distance };
    });

    // Sort by distance (nearest first) for optimal travel route
    shopsWithDistance.sort((a, b) => a.distance - b.distance);

    // Calculate total route distance
    let totalDistance = 0;
    if (shopsWithDistance.length > 1) {
      for (let i = 1; i < shopsWithDistance.length; i++) {
        totalDistance += calculateDistance(
          shopsWithDistance[i - 1].shop_latitude,
          shopsWithDistance[i - 1].shop_longitude,
          shopsWithDistance[i].shop_latitude,
          shopsWithDistance[i].shop_longitude
        );
      }
    }

    res.json({
      shops: shopsWithDistance,
      total_distance: totalDistance.toFixed(1),
      message: `为你规划了 ${shopsWithDistance.length} 家咖啡店的路线`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('GET /api/v1/travel-plan error:', message);
    res.status(500).json({ error: message });
  }
});

// ============ Helper Functions ============

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse Amap cost field: may be '41.00', 41, '[]', [] or null -> number | null
function parseCost(cost: unknown): number | null {
  if (cost == null) return null;
  if (Array.isArray(cost)) return null;
  const parsed = typeof cost === 'number' ? cost : parseFloat(String(cost));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function getDemoShops(lat: number, lng: number, isBrunch = false) {
  const coffeeShops = [
    { name: 'Manner Coffee', address: '南京西路1688号', phone: '021-6288-1688', rating: 4.5, cost: 25, latOff: 0.002, lngOff: 0.003 },
    { name: 'Seesaw Coffee', address: '愚园路1107号', phone: '021-6288-2688', rating: 4.3, cost: 42, latOff: -0.003, lngOff: 0.001 },
    { name: '% Arabica', address: '武康路378号', phone: '021-6288-3688', rating: 4.7, cost: 40, latOff: 0.001, lngOff: -0.002 },
    { name: 'Metal Hands', address: '长乐路672号', phone: '021-6288-4688', rating: 4.4, cost: 35, latOff: -0.001, lngOff: -0.004 },
    { name: 'Greybox Coffee', address: '新天地南里广场', phone: '021-6288-5688', rating: 4.2, cost: 55, latOff: 0.004, lngOff: 0.002 },
    { name: 'M Stand', address: '淮海中路999号', phone: '021-6288-6688', rating: 4.6, cost: 38, latOff: -0.002, lngOff: 0.005 },
    { name: 'RUMORS Coffee', address: '安福路322号', phone: '021-6288-7688', rating: 4.1, cost: 48, latOff: 0.003, lngOff: -0.001 },
    { name: 'O.P.S. Cafe', address: '巨鹿路758号', phone: '021-6288-8688', rating: 4.8, cost: 60, latOff: -0.004, lngOff: -0.002 },
  ];

  const brunchShops = [
    { name: 'gaga', address: '岭南新天地L203', phone: '021-6288-1188', rating: 4.6, cost: 85, latOff: 0.002, lngOff: 0.002 },
    { name: 'Wagas', address: '中区广场1楼', phone: '021-6288-2288', rating: 4.3, cost: 70, latOff: -0.002, lngOff: 0.004 },
    { name: 'Baker & Spice', address: 'K11购物艺术中心B1', phone: '021-6288-3388', rating: 4.4, cost: 65, latOff: 0.003, lngOff: -0.003 },
    { name: '星美乐 Baker & Star', address: '南京西路789号', phone: '021-6288-4488', rating: 4.5, cost: 78, latOff: -0.003, lngOff: -0.001 },
    { name: '巴黎贝甜 Paris Baguette', address: '新世界城B1', phone: '021-6288-5588', rating: 4.0, cost: 38, latOff: 0.001, lngOff: 0.005 },
    { name: 'Farm+Bread', address: '淮海中路300号', phone: '021-6288-6688', rating: 4.2, cost: 52, latOff: 0.004, lngOff: -0.004 },
  ];

  const baseShops = isBrunch ? brunchShops : coffeeShops;

  return baseShops.map((shop, i) => ({
    poi_id: `demo_${i}`,
    name: shop.name,
    address: shop.address,
    phone: shop.phone,
    rating: shop.rating,
    cost: shop.cost,
    latitude: lat + shop.latOff,
    longitude: lng + shop.lngOff,
    distance: (Math.random() * 2 + 0.1).toFixed(1),
    type: isBrunch ? '餐饮服务;外国餐厅' : '餐饮服务;咖啡厅',
    photos: [],
  }));
}

// Vercel Serverless: export the Express app as the function handler
export default app;

// Start HTTP server only in local/standalone mode (Vercel injects VERCEL=1)
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}/`);
  });
}
