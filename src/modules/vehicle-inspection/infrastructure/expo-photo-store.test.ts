import { createExpoPhotoStore, resizeFor } from './expo-photo-store';

const mockFs = {
  sizes: new Map<string, number>(),
  deleted: [] as string[],
  moved: [] as [string, string][],
};

jest.mock('expo-file-system', () => {
  const uriOf = (parts: unknown[]) =>
    parts
      .map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri))
      .join('/');
  class Directory {
    uri: string;
    exists = true;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    create() {}
    delete() {
      mockFs.deleted.push(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    get exists() {
      return true;
    }
    get size() {
      return mockFs.sizes.get(this.uri) ?? 0;
    }
    async move(target: File) {
      mockFs.moved.push([this.uri, target.uri]);
    }
    delete() {
      mockFs.deleted.push(this.uri);
    }
    async bytes() {
      return new TextEncoder().encode('jpeg');
    }
  }
  return { Directory, File, Paths: { document: { uri: 'file:///docs' } } };
});

const mockSaveAsync = jest.fn();
const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: (size: unknown) => {
        mockResize(size);
        return { renderAsync: async () => ({ saveAsync: mockSaveAsync }) };
      },
    }),
  },
}));

beforeEach(() => {
  mockFs.sizes.clear();
  mockFs.deleted = [];
  mockFs.moved = [];
  mockSaveAsync.mockReset();
  mockResize.mockReset();
});

describe('resizeFor', () => {
  it('limita el lado mayor a 1600 px sin agrandar fotos pequeñas', () => {
    expect(resizeFor({ width: 4000, height: 3000 })).toEqual({ width: 1600 });
    expect(resizeFor({ width: 3000, height: 4000 })).toEqual({ height: 1600 });
    expect(resizeFor({ width: 1200, height: 900 })).toEqual({ width: 1200 });
  });
});

describe('createExpoPhotoStore', () => {
  const store = createExpoPhotoStore({ createId: () => 'p1' });
  const input = {
    inspectionId: 'insp-1',
    stepId: 'front-photo',
    capture: { uri: 'file:///cache/camera.jpg', width: 4000, height: 3000 },
    takenAt: new Date('2026-10-05T17:00:00Z'),
  };

  it('comprime, mueve a documentos, borra la original y calcula el hash', async () => {
    mockSaveAsync.mockResolvedValue({ uri: 'file:///cache/out.jpg', width: 1600, height: 1200 });
    mockFs.sizes.set('file:///cache/out.jpg', 300_000);

    const photo = await store.save(input);

    expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
    expect(mockSaveAsync).toHaveBeenCalledTimes(1);
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg' });
    expect(mockFs.moved).toEqual([
      ['file:///cache/out.jpg', 'file:///docs/inspections/insp-1/front-photo-p1.jpg'],
    ]);
    expect(mockFs.deleted).toContain('file:///cache/camera.jpg');
    expect(photo).toEqual({
      id: 'p1',
      uri: 'file:///docs/inspections/insp-1/front-photo-p1.jpg',
      takenAt: '2026-10-05T17:00:00.000Z',
      width: 1600,
      height: 1200,
      bytes: 4,
      // sha256("jpeg")
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('si pesa más de 500 KB baja la calidad', async () => {
    mockSaveAsync
      .mockResolvedValueOnce({ uri: 'file:///cache/big.jpg', width: 1600, height: 1200 })
      .mockResolvedValueOnce({ uri: 'file:///cache/ok.jpg', width: 1600, height: 1200 });
    mockFs.sizes.set('file:///cache/big.jpg', 900_000);
    mockFs.sizes.set('file:///cache/ok.jpg', 400_000);

    await store.save(input);

    expect(mockSaveAsync).toHaveBeenNthCalledWith(2, { compress: 0.55, format: 'jpeg' });
    expect(mockFs.deleted).toContain('file:///cache/big.jpg');
  });

  it('borra una foto o todas las de una inspección', async () => {
    await store.delete({ uri: 'file:///docs/inspections/insp-1/a.jpg' } as never);
    await store.deleteAll('insp-1');

    expect(mockFs.deleted).toEqual([
      'file:///docs/inspections/insp-1/a.jpg',
      'file:///docs/inspections/insp-1',
    ]);
  });

  it('no intenta borrar una foto que ya estaba en el servidor', async () => {
    await store.delete({ uri: 'https://s3/a.jpg', remoteUrl: 'https://s3/a.jpg' } as never);

    expect(mockFs.deleted).toEqual([]);
  });

  it('lee la foto en base64 para enviarla', async () => {
    expect(await store.readBase64({ uri: 'file:///docs/a.jpg' } as never)).toBe('anBlZw==');
  });
});
