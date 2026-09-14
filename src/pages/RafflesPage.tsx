import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title, Text, Button, Group, Stack, Card, Badge, TextInput,
  Box, ActionIcon, Modal, Skeleton, Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import { raffleApi } from '@/api/raffleApi';
import type { Raffle } from '@/types/api.types';
import { notifications } from '@mantine/notifications';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Sin iniciar', color: 'gray' },
  in_progress: { label: 'En proceso', color: 'orange' },
  finished: { label: 'Finalizado', color: 'green' },
};

export function RafflesPage() {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortByDate, setSortByDate] = useState('false');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Raffle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const fetchRaffles = async () => {
    setLoading(true);
    try {
      const data = await raffleApi.getAll({
        name: search || undefined,
        sortByDate: sortByDate === 'true',
      });
      setRaffles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRaffles(); }, [search, sortByDate]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const raffle = await raffleApi.create({ name: newName.trim() });
      closeCreate();
      setNewName('');
      navigate(`/raffles/${raffle.id}`);
    } catch {
      notifications.show({ message: 'Error al crear el sorteo', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await raffleApi.delete(deleteTarget.id);
      setRaffles(prev => prev.filter(r => r.id !== deleteTarget.id));
      closeDelete();
      setDeleteTarget(null);
    } catch {
      notifications.show({ message: 'Error al eliminar el sorteo', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Sorteos</Title>
          <Text c="dimmed" size="sm">Gestioná todos tus sorteos</Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} color="orange" onClick={openCreate}>
          Nuevo sorteo
        </Button>
      </Group>

      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Buscar por nombre..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          value={sortByDate}
          onChange={v => setSortByDate(v ?? 'false')}
          data={[
            { value: 'false', label: 'Orden alfabético' },
            { value: 'true', label: 'Más recientes primero' },
          ]}
          w={200}
        />
      </Group>

      {loading ? (
        <Stack>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={70} radius="md" />)}
        </Stack>
      ) : raffles.length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <Text c="dimmed">No se encontraron sorteos.</Text>
        </Card>
      ) : (
        <Stack gap="xs">
          {raffles.map(raffle => (
            <Card key={raffle.id} withBorder radius="md" p="md">
              <Group justify="space-between" wrap="nowrap">
                <Box style={{ overflow: 'hidden', flex: 1 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={500} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {raffle.name}
                    </Text>
                    <Badge color={STATUS_LABELS[raffle.status]?.color} variant="light" size="sm">
                      {STATUS_LABELS[raffle.status]?.label}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {new Date(raffle.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </Box>
                <Group gap="xs" wrap="nowrap">
                  {raffle.publicSlug && (
                    <ActionIcon variant="subtle" color="blue" onClick={() => window.open(`/s/${raffle.publicSlug}`, '_blank')}>
                      <IconEye size={16} />
                    </ActionIcon>
                  )}
                  <ActionIcon variant="subtle" color="orange" onClick={() => navigate(`/raffles/${raffle.id}`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(raffle); openDelete(); }}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Nuevo sorteo" centered>
        <Stack>
          <TextInput
            label="Nombre del sorteo"
            placeholder="Ej: JDT 2026"
            value={newName}
            onChange={e => setNewName(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && void handleCreate()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeCreate}>Cancelar</Button>
            <Button color="orange" loading={creating} onClick={() => void handleCreate()}>
              Crear sorteo
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete confirm modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Eliminar sorteo" centered>
        <Stack>
          <Text>¿Estás seguro que querés eliminar el sorteo <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>Cancelar</Button>
            <Button color="red" loading={deleting} onClick={() => void handleDelete()}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}