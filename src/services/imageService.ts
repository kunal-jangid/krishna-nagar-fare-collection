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
    const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildingId);

    // 1. Auto-register building if it doesn't exist (to fix UUID error)
    if (!isRealUUID) {
      console.log('Building not in DB, auto-registering before image update...');
      const { data: newBuilding, error: bError } = await supabase
        .from('buildings')
        .insert({
          house_no: building.house_no,
          owner_name: building.owner_name,
          row: building.row,
          col: building.col,
          floors: building.floors,
        })
        .select()
        .single();
      
      if (bError) {
        console.error('Error auto-registering building for image:', bError.message);
        return null;
      }
      buildingId = newBuilding.building_id;
      console.log('Building registered for image:', buildingId);
    }

    // 2. Define filenames and paths
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${buildingId}-${Date.now()}.${fileExt}`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // 3. Save locally for instant access
    await FileSystem.copyAsync({
      from: asset.uri,
      to: localUri
    });
    console.log('Image saved locally:', localUri);

    // 4. Update database record to point to LOCAL uri immediately
    const { error: dbError } = await supabase
      .from('buildings')
      .update({ image_url: localUri })
      .eq('building_id', buildingId);

    if (dbError) console.error('Database update error:', dbError.message);

    // 5. Cloud Backup
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
          
        await supabase
          .from('buildings')
          .update({ image_url: publicUrl })
          .eq('building_id', buildingId);
          
        console.log('Cloud backup ready at:', publicUrl);
        return publicUrl; // Prefer public URL for consistency
      }
    } catch (sErr) {
      console.warn('Storage sync failed, using local copy.');
    }

    return localUri;
  } catch (err) {
    console.error('Unexpected upload error:', err);
    return null;
  }
};
