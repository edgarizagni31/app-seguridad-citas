import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CapturedPhoto, PhotoStore } from '../domain';

const MAX_SIDE = 1600;
const MAX_BYTES = 500_000;
// Se baja la calidad solo si la foto sigue pesando más de 500 KB
const QUALITY_STEPS = [0.7, 0.55, 0.4] as const;

export const resizeFor = ({ width, height }: Pick<CapturedPhoto, 'width' | 'height'>) =>
  width >= height ? { width: Math.min(MAX_SIDE, width) } : { height: Math.min(MAX_SIDE, height) };

const inspectionDir = (inspectionId: string) =>
  new Directory(Paths.document, 'inspections', inspectionId);

const deleteIfExists = (file: File | Directory) => {
  if (file.exists) file.delete();
};

export function createExpoPhotoStore(deps: { readonly createId: () => string }): PhotoStore {
  return {
    async save({ inspectionId, stepId, capture, takenAt }) {
      const image = await ImageManipulator.manipulate(capture.uri)
        .resize(resizeFor(capture))
        .renderAsync();
      let saved = await image.saveAsync({ compress: QUALITY_STEPS[0], format: SaveFormat.JPEG });
      for (const compress of QUALITY_STEPS.slice(1)) {
        if (new File(saved.uri).size <= MAX_BYTES) break;
        deleteIfExists(new File(saved.uri));
        saved = await image.saveAsync({ compress, format: SaveFormat.JPEG });
      }

      const dir = inspectionDir(inspectionId);
      dir.create({ intermediates: true, idempotent: true });
      const id = deps.createId();
      const target = new File(dir, `${stepId}-${id}.jpg`);
      await new File(saved.uri).move(target);
      // La foto original de la cámara queda en caché: se borra para no dejar copias
      deleteIfExists(new File(capture.uri));

      const bytes = await target.bytes();
      return {
        id,
        uri: target.uri,
        takenAt: takenAt.toISOString(),
        width: saved.width,
        height: saved.height,
        bytes: bytes.length,
        hash: bytesToHex(sha256(bytes)),
      };
    },
    async delete(photo) {
      deleteIfExists(new File(photo.uri));
    },
    async deleteAll(inspectionId) {
      deleteIfExists(inspectionDir(inspectionId));
    },
    async discardCapture(capture) {
      deleteIfExists(new File(capture.uri));
    },
  };
}
