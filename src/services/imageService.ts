import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { BuildingData } from '../types';

export const uploadBuildingImage = async (building: BuildingData) => {
  console.log(`Starting image capture for building: ${building.building_id}`);
  
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.6,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  try {
    let buildingId = building.building_id;
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(buildingId) || 
                   /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(buildingId);

    // Prepare robust metadata (ensures identity for RLS policies)
    const buildingPayload = {
      house_no: building.house_no || `HN-${building.row}-${building.col}`,
      owner_name: building.owner_name || `Resident ${building.row}-${building.col}`,
      row: building.row,
      col: building.col,
      floors: building.floors || 2,
      track_factor_1: building.track_factor_1 ?? true,
      track_factor_2: building.track_factor_2 ?? true,
      track_factor_3: building.track_factor_3 ?? true,
    };

    if (!isUUID) {
      console.log('[INFO] Auto-registering new building before image upload...');
      const { data: newBuilding, error: bError } = await supabase
        .from('buildings')
        .insert(buildingPayload)
        .select()
        .single();
      
      if (bError) {
        console.error('[ERROR] Building registration failed:', bError.message);
        return null;
      }
      buildingId = newBuilding.building_id;
    } else {
      // Even if it has a UUID, ensure it has metadata (handles reset houses)
      console.log('[INFO] Ensuring building metadata exists before upload...');
      const { error: uError } = await supabase
        .from('buildings')
        .update(buildingPayload)
        .eq('building_id', buildingId);
      
      if (uError) {
        console.warn('[WARN] Metadata update before upload failed:', uError.message);
      }
    }

    // 2. Define filenames and paths
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${buildingId}-${Date.now()}.${fileExt}`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // 3. Save locally for instant access (offline cache)
    await FileSystem.copyAsync({
      from: asset.uri,
      to: localUri
    });
    console.log('[INFO] Image saved locally:', localUri);

    // 4. Cloud Backup
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[ERROR] No active session found. Upload aborted.');
      return localUri;
    }

    const userId = session.user.id;
    // Including userId in path often satisfies default Supabase Storage policies
    const filePath = `buildings/${userId}/${fileName}`;
    const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

    // Fix: Properly read as base64 and decode to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);

    try {
      console.log(`[INFO] Uploading to storage for user ${userId}: ${filePath}...`);
      const { error: storageError } = await supabase.storage
        .from('building-images')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (!storageError) {
        const { data } = supabase.storage
          .from('building-images')
          .getPublicUrl(filePath);
        
        const publicUrl = data.publicUrl;
          
        if (publicUrl && publicUrl.startsWith('http')) {
          console.log('[SUCCESS] Cloud storage public URL:', publicUrl);
          // Update database with verified Public URL
          const { error: dbError } = await supabase
            .from('buildings')
            .update({ image_url: publicUrl })
            .eq('building_id', buildingId);
            
          if (dbError) {
            console.error('[ERROR] Failed to update building with public URL:', dbError.message);
          } else {
            console.log('[INFO] Building record updated with cloud image URL.');
            return publicUrl;
          }
        }
      } else {
        console.error('[ERROR] Storage upload failed:', storageError.message);
      }
    } catch (sErr: any) {
      console.error('[ERROR] Storage sync exception:', sErr.message);
    }

    console.log('[INFO] Returning local URI for immediate preview:', localUri);
    return localUri; 
  } catch (err: any) {
    console.error('[ERROR] Unexpected upload error:', err.message);
    return null;
  }
};

/**
 * Downloads all remote images to local storage for offline access.
 */
export const syncImagesLocally = async (buildings: BuildingData[]) => {
  console.log('Syncing images locally for offline use...');
  for (const b of buildings) {
    if (b.image_url && b.image_url.startsWith('http')) {
      const fileExt = b.image_url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${b.building_id}.${fileExt}`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        try {
          await FileSystem.downloadAsync(b.image_url, localUri);
          console.log(`Downloaded image for ${b.house_no}`);
        } catch (e) {
          console.warn(`Failed to download image for ${b.building_id}`);
        }
      }
    }
  }
};
