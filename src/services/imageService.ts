import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export const uploadBuildingImage = async (buildingId: string) => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    const fileExt = asset.uri.split('.').pop();
    const fileName = `${buildingId}-${Math.random()}.${fileExt}`;
    const filePath = `buildings/${fileName}`;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: fileName,
      type: `image/${fileExt}`,
    } as any);

    const { data, error } = await supabase.storage
      .from('building-images')
      .upload(filePath, formData);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('building-images')
      .getPublicUrl(filePath);

    // Update building record
    await supabase
      .from('buildings')
      .update({ image_url: publicUrl })
      .eq('building_id', buildingId);

    return publicUrl;
  }
  return null;
};
