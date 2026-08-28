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
        photos: poi.photos || [],
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
