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
    // We expect the caller to have registered the building or we do it here if needed,
    // but the plan says centralized logic. For now, let's keep the registration here 
    // but ensure we ONLY update DB with public URL.
    
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(buildingId);

    if (!isUUID) {
      console.log('Building not in DB, auto-registering before image update...');
      const { data: newBuilding, error: bError } = await supabase
        .from('buildings')
        .insert({
          house_no: building.house_no,
          owner_name: building.owner_name,
          row: building.row,
          col: building.col,
          floors: building.floors,
          track_factor_1: building.track_factor_1 ?? true,
          track_factor_2: building.track_factor_2 ?? true,
          track_factor_3: building.track_factor_3 ?? true,
        })
        .select()
        .single();
      
      if (bError) {
        console.error('Error auto-registering building for image:', bError.message);
        return null;
      }
      buildingId = newBuilding.building_id;
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
    console.log('Image saved locally:', localUri);

    // 4. Cloud Backup
    const localFile = new File(localUri);
    const base64 = await localFile.base64();
    const arrayBuffer = decode(base64);
    const filePath = `buildings/${fileName}`;
    const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

    try {
      const { error: storageError } = await supabase.storage
        .from('building-images')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (!storageError) {
        const { data: { publicUrl } } = supabase.storage
          .from('building-images')
          .getPublicUrl(filePath);
          
        // ONLY update database with Public URL
        await supabase
          .from('buildings')
          .update({ image_url: publicUrl })
          .eq('building_id', buildingId);
          
        console.log('Cloud backup ready at:', publicUrl);
        return publicUrl;
      }
    } catch (sErr) {
      console.warn('Storage sync failed.');
    }

    return localUri; // Return local URI for immediate UI update even if cloud fails
  } catch (err) {
    console.error('Unexpected upload error:', err);
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
