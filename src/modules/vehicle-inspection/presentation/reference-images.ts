import type { ImageSource } from 'expo-image';

// RF-G5b: única referencia a las imágenes referenciales; se reemplazan cambiando solo los archivos
export const REFERENCE_IMAGES: Readonly<Record<string, ImageSource>> = {
  'front-photo': require('../../../../assets/images/inspection/front-photo.jpg') as ImageSource,
  'has-trailer': require('../../../../assets/images/inspection/has-trailer.jpg') as ImageSource,
  'trailer-photo': require('../../../../assets/images/inspection/trailer-photo.jpg') as ImageSource,
  'has-rear-left-seal':
    require('../../../../assets/images/inspection/has-rear-left-seal.jpg') as ImageSource,
  'rear-left-seal-photo':
    require('../../../../assets/images/inspection/rear-left-seal-photo.jpg') as ImageSource,
  'has-rear-right-seal':
    require('../../../../assets/images/inspection/has-rear-right-seal.jpg') as ImageSource,
  'rear-right-seal-photo':
    require('../../../../assets/images/inspection/rear-right-seal-photo.jpg') as ImageSource,
  'has-side-door': require('../../../../assets/images/inspection/has-side-door.jpg') as ImageSource,
  'side-door-photo':
    require('../../../../assets/images/inspection/side-door-photo.jpg') as ImageSource,
  'has-side-seal': require('../../../../assets/images/inspection/has-side-seal.jpg') as ImageSource,
  'side-seal-photo':
    require('../../../../assets/images/inspection/side-seal-photo.jpg') as ImageSource,
  'cabin-photo': require('../../../../assets/images/inspection/cabin-photo.jpg') as ImageSource,
  'has-waybill': require('../../../../assets/images/inspection/has-waybill.jpg') as ImageSource,
  'waybill-photo': require('../../../../assets/images/inspection/waybill-photo.jpg') as ImageSource,
};
