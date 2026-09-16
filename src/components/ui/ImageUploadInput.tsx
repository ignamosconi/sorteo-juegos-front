import { useState, useEffect } from 'react';
import { Box, Button, FileButton, Group, Image, Text, Stack } from '@mantine/core';
import { IconUpload, IconTrash } from '@tabler/icons-react';
import { validateImageFile } from '@/utils/imageValidator';
import { fileUploadApi } from '@/api/fileUploadApi';
import { getImageUrl } from '@/utils/imageUrl';

interface ImageUploadInputProps {
  label?: string;
  value?: string | null;
  onChange: (path: string | null) => void;
}

export function ImageUploadInput({ label, value, onChange }: ImageUploadInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setCurrentPath(value || null);
  }, [value]);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    // 1. Validar el archivo seleccionado
    const validation = await validateImageFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido');
      return;
    }

    // Archivo válido: limpiar errores y proceder con la subida
    setError(null);
    setUploading(true);

    try {
      const uploadedPath = await fileUploadApi.uploadImage(file);
      setCurrentPath(uploadedPath);
      onChange(uploadedPath);
    } catch {
      setError('Error al subir la imagen al servidor');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (currentPath) {
      await fileUploadApi.deleteImage(currentPath);
    }
    setCurrentPath(null);
    setError(null);
    onChange(null);
  };

  const displayUrl = getImageUrl(currentPath);

  return (
    <Stack gap="xs">
      {label && <Text size="sm" fw={500}>{label}</Text>}

      <Group align="center" gap="md">
        {displayUrl && (
          <Box style={{ position: 'relative' }}>
            <Image
              src={displayUrl}
              w={54}
              h={54}
              radius="xl"
              fit="contain"
              p={4}
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                background: 'var(--mantine-color-default-hover)',
              }}
            />
          </Box>
        )}

        <Stack gap={4}>
          <Group gap="xs">
            <FileButton onChange={handleFileSelect} accept="image/png,image/jpeg,image/webp,image/svg+xml">
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconUpload size={14} />}
                  loading={uploading}
                >
                  Seleccionar archivo
                </Button>
              )}
            </FileButton>

            {currentPath && (
              <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={() => void handleRemove()}>
                Quitar
              </Button>
            )}
          </Group>

          <Text size="xs" c="dimmed">
            Formatos permitidos: PNG, JPG, WEBP, SVG (máx. 5 MB).
          </Text>
        </Stack>
      </Group>

      {error && (
        <Text size="xs" c="red" fw={500}>
          {error}
        </Text>
      )}
    </Stack>
  );
}