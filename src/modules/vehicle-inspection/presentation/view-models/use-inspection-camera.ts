import type { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type RefObject } from 'react';

import type { CapturedPhoto } from '../../domain';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';
import { useCameraAccess } from '@/shared/ui';

export function useInspectionCamera(ref: RefObject<CameraView | null>) {
  const router = useRouter();
  const { inspectionId, stepId } = useLocalSearchParams<{
    inspectionId: string;
    stepId: string;
  }>();
  const { inspections, logger } = useDependencies();
  const camera = useCameraAccess();
  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shoot = async () => {
    if (!ref.current || capturing) return;
    setCapturing(true);
    try {
      const picture = await ref.current.takePictureAsync({ quality: 0.9 });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      setPreview({ uri: picture.uri, width: picture.width, height: picture.height });
    } catch (cause) {
      logger.error('No se pudo tomar la foto', { error: String(cause) });
      setError(STRINGS.inspection.photoFailed);
    } finally {
      setCapturing(false);
    }
  };

  const use = async () => {
    if (!preview || saving) return;
    setSaving(true);
    const result = await inspections.capturePhoto(inspectionId, stepId, preview);
    setSaving(false);
    if (!result.ok) {
      logger.warn('No se pudo guardar la foto', { error: result.error.type });
      setError(STRINGS.inspection.photoFailed);
      return;
    }
    router.back();
  };

  const retake = () => {
    if (preview) void inspections.discardCapture(preview);
    setPreview(null);
    setError(null);
  };

  return {
    stepId,
    camera,
    torchOn,
    toggleTorch: () => setTorchOn((on) => !on),
    capturing,
    preview,
    saving,
    error,
    shoot: () => void shoot(),
    use: () => void use(),
    retake,
    close: () => {
      if (preview) void inspections.discardCapture(preview);
      router.back();
    },
  };
}
