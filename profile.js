// Perfil de usuario: nombre, apellido, teléfono (con código de país) y foto de perfil
// (con iniciales de respaldo si no hay foto). Vive en la tabla public.profiles (ver
// supabase-perfil.sql) en vez de en la metadata de Supabase Auth, porque más adelante
// ("Movimientos compartidos") vamos a necesitar leer el perfil de OTRA persona, y la
// metadata de auth.users de alguien más no se puede consultar desde el cliente.

// Lista corta de códigos de país (no exhaustiva: los más probables para esta app).
export const COUNTRY_CODES = {
  '+52': '+52 México', '+1': '+1 EE. UU. / Canadá', '+34': '+34 España',
  '+54': '+54 Argentina', '+57': '+57 Colombia', '+56': '+56 Chile',
  '+51': '+51 Perú', '+58': '+58 Venezuela', '+593': '+593 Ecuador',
  '+502': '+502 Guatemala', '+503': '+503 El Salvador', '+504': '+504 Honduras',
  '+505': '+505 Nicaragua', '+506': '+506 Costa Rica', '+507': '+507 Panamá',
  '+591': '+591 Bolivia', '+595': '+595 Paraguay', '+598': '+598 Uruguay',
  '+44': '+44 Reino Unido', '+49': '+49 Alemania', '+33': '+33 Francia',
};

export function profileName(p) {
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
}

export function profileInitials(p, fallbackEmail) {
  const name = profileName(p);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || parts[0]?.slice(0, 2).toUpperCase() || '';
  }
  return (fallbackEmail || '').slice(0, 2).toUpperCase();
}

export async function fetchProfile(client, userId) {
  if (!client || !userId) return null;
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) return null;
  return data || { id: userId, first_name: '', last_name: '', phone_country_code: '+52', phone_number: '', avatar_url: null };
}

export async function saveProfile(client, userId, { first_name, last_name, phone_country_code, phone_number }) {
  const { error } = await client
    .from('profiles')
    .update({ first_name: first_name || '', last_name: last_name || '', phone_country_code: phone_country_code || '+52', phone_number: phone_number || '', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw Error('No se pudo guardar tu perfil: ' + error.message);
}

// Reduce cualquier imagen a un cuadrado de hasta 256×256 en JPEG, para no subir fotos de
// varios MB de la cámara del teléfono y para que todos los avatares se vean consistentes
// (recortados al centro) sin necesitar un editor de recorte.
export function resizeImageToJpeg(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(Error('No se pudo procesar la imagen.'))), 'image/jpeg', 0.85);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error('Ese archivo no parece ser una imagen válida.'));
    };
    img.src = url;
  });
}

export async function uploadAvatar(client, userId, file) {
  const blob = await resizeImageToJpeg(file);
  const path = userId + '/avatar.jpg';
  const { error: upErr } = await client.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (upErr) throw Error('No se pudo subir la foto: ' + upErr.message);
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  // Cadena al final para evitar que el navegador muestre la foto anterior cacheada con la misma URL.
  const avatar_url = data.publicUrl + '?t=' + Date.now();
  const { error: updErr } = await client.from('profiles').update({ avatar_url, updated_at: new Date().toISOString() }).eq('id', userId);
  if (updErr) throw Error('La foto se subió, pero no se pudo guardar en tu perfil: ' + updErr.message);
  return avatar_url;
}
