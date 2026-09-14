import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title, Text, Button, Group, SimpleGrid, Card, Stack,
  Badge, Skeleton, Box, Modal, TextInput,
} from '@mantine/core';
import { IconPlus, IconTrophy, IconSettings, IconPlayerPlay, IconCheck } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { raffleApi } from '@/api/raffleApi';
import type { Raffle } from '@/types/api.types';
import { notifications } from '@mantine/notifications';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Sin configurar', color: 'gray' },
  configured: { label: 'Configurado', color: 'blue' },
  in_progress: { label: 'En proceso', color: 'orange' },
  finished: { label: 'Finalizado', color: 'green' },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    raffleApi.getAll({ sortByDate: true }).then(data => {
      const sorted = [...data].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      setRaffles(sorted);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const raffle = await raffleApi.create({ name: newName.trim() });
      close();
      setNewName('');
      navigate(`/raffles/${raffle.id}`);
    } catch {
      notifications.show({ message: 'Error al crear el sorteo', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const counts = {
    pending: raffles.filter(r => r.status === 'pending').length,
    configured: raffles.filter(r => r.status === 'configured').length,
    in_progress: raffles.filter(r => r.status === 'in_progress').length,
    finished: raffles.filter(r => r.status === 'finished').length,
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">Bienvenido al panel de administración</Text>
        </Box>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={100} radius="md" />)
        ) : (
          <>
            <Card withBorder radius="md" p="lg">
              <Group>
                <IconTrophy size={28} color="var(--mantine-color-gray-5)" />
                <Box>
                  <Text size="xl" fw={700}>{counts.pending}</Text>
                  <Text size="sm" c="dimmed">Sin configurar</Text>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Group>
                <IconSettings size={28} color="var(--mantine-color-blue-5)" />
                <Box>
                  <Text size="xl" fw={700}>{counts.configured}</Text>
                  <Text size="sm" c="dimmed">Configurados</Text>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Group>
                <IconPlayerPlay size={28} color="var(--mantine-color-orange-5)" />
                <Box>
                  <Text size="xl" fw={700}>{counts.in_progress}</Text>
                  <Text size="sm" c="dimmed">En proceso</Text>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Group>
                <IconCheck size={28} color="var(--mantine-color-green-5)" />
                <Box>
                  <Text size="xl" fw={700}>{counts.finished}</Text>
                  <Text size="sm" c="dimmed">Finalizados</Text>
                </Box>
              </Group>
            </Card>
          </>
        )}
      </SimpleGrid>

      <Title order={4} mb="md">Sorteos recientes</Title>

      {loading ? (
        <Stack>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} radius="md" />)}
        </Stack>
      ) : raffles.length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <Text c="dimmed">No hay sorteos creados todavía.</Text>
          <Button mt="md" color="orange" leftSection={<IconPlus size={16} />} onClick={open}>
            Crear el primero
          </Button>
        </Card>
      ) : (
        <Stack gap="xs">
          {raffles.slice(0, 5).map(raffle => (
            <Card key={raffle.id} withBorder radius="md" p="md" style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/raffles/${raffle.id}`)}>
              <Group justify="space-between">
                <Text fw={500}>{raffle.name}</Text>
                <Badge color={STATUS_LABELS[raffle.status]?.color} variant="light">
                  {STATUS_LABELS[raffle.status]?.label}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                {new Date(raffle.updatedAt || raffle.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
            </Card>
          ))}
          {raffles.length > 5 && (
            <Button variant="subtle" color="orange" onClick={() => navigate('/raffles')}>
              Ver todos los sorteos →
            </Button>
          )}
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title="Nuevo sorteo" centered>
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
            <Button variant="subtle" onClick={close}>Cancelar</Button>
            <Button color="orange" loading={creating} onClick={() => void handleCreate()}>
              Crear sorteo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}