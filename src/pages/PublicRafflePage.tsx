import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Button, Card, Grid, Stack, Badge,
  Loader, Center, Group, Image, Table, SimpleGrid, Paper,
} from '@mantine/core';
import { IconPlayerPlay, IconTrophy } from '@tabler/icons-react';
import { drawApi } from '@/api/drawApi';
import { useAuthStore } from '@/store/authStore';
import { systemConfigApi } from '@/api/systemConfigApi';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getImageUrl } from '@/utils/imageUrl';
import { ENV } from '@/config/env';
import type { SystemConfig, PublicResultsResponse } from '@/types/api.types';

export function PublicRafflePage() {
  const { publicSlug } = useParams<{ publicSlug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isLoggedIn = !!useAuthStore.getState().accessToken;

  const load = useCallback(async () => {
    if (!publicSlug) return;
    try {
      const [publicData, cfg] = await Promise.all([
        drawApi.getPublicResults(publicSlug),
        systemConfigApi.getPublic(),
      ]);
      setData(publicData);
      setConfig(cfg);

      const tabTitle = cfg?.publicTabName?.trim() || publicData?.raffle?.name || ENV.APP_NAME;
      document.title = tabTitle;

      if (cfg?.publicFaviconPath) {
        const faviconUrl = getImageUrl(cfg.publicFaviconPath);
        if (faviconUrl) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
        }
      }
    } catch {
      // no encontrado
    } finally {
      setLoading(false);
    }
  }, [publicSlug]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);

    const handleUpdate = () => void load();
    window.addEventListener('raffle_draw_updated', handleUpdate);

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('raffle_draw_channel');
      bc.onmessage = () => void load();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('raffle_draw_updated', handleUpdate);
      if (bc) bc.close();
    };
  }, [load]);

  if (loading) return <Center h="100dvh"><Loader color="orange" size="lg" /></Center>;
  if (!data) return (
    <Center h="100dvh">
      <Stack align="center">
        <Text size="xl" fw={700}>Sorteo no encontrado</Text>
        <Text c="dimmed">El link puede ser incorrecto o el sorteo no existe.</Text>
      </Stack>
    </Center>
  );

  const currentSportData = data.sports.find(s => s.sport.id === selectedSport);
  const currentSection = currentSportData?.sections.find(s =>
    (s.category?.id ?? 'none') === (selectedCategory ?? 'none')
  );

  return (
    <Box mih="100dvh" style={{ background: 'var(--mantine-color-body)' }}>
      {/* Header Banner */}
      <Box
        py="lg"
        px="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group justify="space-between" maw={1000} mx="auto" align="center">
          <Group gap="sm">
            {config?.publicImagePath ? (
              <Image src={getImageUrl(config.publicImagePath)} h={40} fit="contain" />
            ) : (
              <IconTrophy size={32} color="var(--mantine-color-orange-5)" />
            )}
            <Box>
              <Title order={2} style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
                {config?.publicTitle || data.raffle.name}
              </Title>
              <Text size="xs" c="dimmed">{data.raffle.name}</Text>
            </Box>
          </Group>

          <Group gap="xs">
            <ThemeToggle />
            {isLoggedIn && data.raffle.drawSlug && data.raffle.status === 'in_progress' && (
              <Button
                size="xs"
                color="orange"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => navigate(`/sortear/${data.raffle.drawSlug}`)}
              >
                Seguir sorteando
              </Button>
            )}
          </Group>
        </Group>
      </Box>

      {/* Main Content */}
      <Box p="md" maw={1000} mx="auto">
        {!selectedSport ? (
          <Stack gap="md">
            <Text fw={600} ta="center">Seleccioná un deporte para ver las tablas</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {data.sports.map(s => (
                <Card
                  key={s.sport.id}
                  withBorder
                  radius="md"
                  p="lg"
                  ta="center"
                  style={{ cursor: 'pointer', transition: 'transform 150ms' }}
                  onClick={() => {
                    setSelectedSport(s.sport.id);
                    if (s.hasCategories) setSelectedCategory(null);
                    else setSelectedCategory('none');
                  }}
                >
                  <Text fw={800} size="xl">{s.sport.name.toUpperCase()}</Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {s.hasCategories ? `${s.sections.length} categorías` : 'Categoría General'}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : !selectedCategory ? (
          <Stack gap="md">
            <Button variant="subtle" size="xs" onClick={() => { setSelectedSport(null); setSelectedCategory(null); }}>
              ← Volver a deportes
            </Button>
            <Text fw={600} ta="center">Seleccioná una categoría — {currentSportData?.sport.name}</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {currentSportData?.sections.map(sec => (
                <Card
                  key={sec.category?.id ?? 'none'}
                  withBorder
                  radius="md"
                  p="lg"
                  ta="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCategory(sec.category?.id ?? 'none')}
                >
                  <Text fw={700}>{sec.category?.name ?? 'General'}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : (
          <Stack gap="md">
            <Group justify="space-between">
              <Button variant="subtle" size="xs" onClick={() => {
                if (currentSportData?.hasCategories) setSelectedCategory(null);
                else { setSelectedSport(null); setSelectedCategory(null); }
              }}>
                ← Volver
              </Button>
              <Badge color="orange" variant="light" size="lg">
                {currentSportData?.sport.name}
                {currentSection?.category ? ` — ${currentSection.category.name}` : ''}
              </Badge>
            </Group>

            {!currentSection || currentSection.groups.length === 0 ? (
              <Paper withBorder radius="md" p="xl" ta="center">
                <Text c="dimmed">No hay grupos configurados todavía.</Text>
              </Paper>
            ) : (
              <Grid spacing="md">
                {currentSection.groups.map(group => {
                  const isFull = group.results.length >= group.capacity;
                  return (
                    <Grid.Col key={group.id} span={{ base: 12, sm: 6, md: 4 }}>
                      <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="xs">
                          <Text fw={700}>{group.name}</Text>
                          <Badge variant="light" color={isFull ? 'green' : 'orange'} size="sm">
                            {group.results.length}/{group.capacity}
                          </Badge>
                        </Group>

                        <Table striped withRowBorders={false} verticalSpacing={6}>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th w={30}>#</Table.Th>
                              <Table.Th>Equipo</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {group.results.map(r => (
                              <Table.Tr key={r.position}>
                                <Table.Td>
                                  <Text size="xs" c="dimmed" fw={700}>{r.position}</Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs" wrap="nowrap">
                                    {r.raffleTeam.imagePath && (
                                      <Image src={getImageUrl(r.raffleTeam.imagePath)} w={20} h={20} fit="contain" />
                                    )}
                                    <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {r.raffleTeam.abbreviation}
                                    </Text>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                            {Array.from({ length: Math.max(0, group.capacity - group.results.length) }).map((_, i) => (
                              <Table.Tr key={`empty-${i}`}>
                                <Table.Td><Text size="xs" c="dimmed">{group.results.length + i + 1}</Text></Table.Td>
                                <Table.Td><Text size="sm" c="dimmed" fs="italic">—</Text></Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Card>
                    </Grid.Col>
                  );
                })}
              </Grid>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}