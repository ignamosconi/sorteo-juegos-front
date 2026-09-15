import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Button, Card, Grid, Stack, Badge,
  Loader, Center, Group, Image, Table, SimpleGrid,
} from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { drawApi } from '@/api/drawApi';
import { useAuthStore } from '@/store/authStore';
import { systemConfigApi } from '@/api/systemConfigApi';
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

      // Título pestaña pública
      const tabTitle = cfg?.publicTabName?.trim() || publicData?.raffle?.name || ENV.APP_NAME;
      document.title = tabTitle;

      // Favicon pestaña pública
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
      // not found
    } finally { setLoading(false); }
  }, [publicSlug]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => clearInterval(interval);
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
      {/* Header */}
      <Box py="xl" px="md" ta="center" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        {config?.publicImagePath && (
          <Image src={getImageUrl(config.publicImagePath)} h={80} fit="contain" mx="auto" mb="md" />
        )}
        <Title order={1} style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
          {config?.publicTitle || data.raffle.name}
        </Title>
        <Text c="dimmed" mt="xs">{data.raffle.name}</Text>
        {isLoggedIn && data.raffle.drawSlug && data.raffle.status === 'in_progress' && (
          <Button mt="md" color="orange" leftSection={<IconPlayerPlay size={16} />}
            onClick={() => navigate(`/sortear/${data.raffle.drawSlug}`)}>
            Seguir sorteando
          </Button>
        )}
      </Box>

      <Box p="md" maw={1000} mx="auto">
        {!selectedSport ? (
          <Stack>
            <Text fw={500} ta="center" mb="md">Seleccioná un deporte para ver los grupos</Text>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
              {data.sports.map(s => (
                <Card key={s.sport.id} withBorder radius="md" p="lg" ta="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedSport(s.sport.id);
                    if (s.hasCategories) setSelectedCategory(null);
                    else setSelectedCategory('none');
                  }}>
                  <Text fw={700} size="xl">{s.sport.name.slice(0, 3).toUpperCase()}</Text>
                  <Text size="sm" c="dimmed">{s.sport.name}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : !selectedCategory ? (
          <Stack>
            <Button variant="subtle" size="sm" onClick={() => { setSelectedSport(null); setSelectedCategory(null); }}>
              ← Volver a deportes
            </Button>
            <Text fw={500} ta="center" mb="md">Seleccioná una categoría</Text>
            <SimpleGrid cols={{ base: 2, sm: 3 }}>
              {currentSportData?.sections.map(sec => (
                <Card key={sec.category?.id ?? 'none'} withBorder radius="md" p="lg" ta="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCategory(sec.category?.id ?? 'none')}>
                  <Text fw={600}>{sec.category?.name ?? 'General'}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : (
          <Stack>
            <Group>
              <Button variant="subtle" size="sm" onClick={() => {
                if (currentSportData?.hasCategories) setSelectedCategory(null);
                else { setSelectedSport(null); setSelectedCategory(null); }
              }}>
                ← Volver
              </Button>
              <Text fw={500}>
                {currentSportData?.sport.name}
                {currentSection?.category ? ` — ${currentSection.category.name}` : ''}
              </Text>
            </Group>

            {!currentSection || currentSection.groups.length === 0 ? (
              <Card withBorder radius="md" p="xl" ta="center">
                <Text c="dimmed">No hay grupos configurados todavía.</Text>
              </Card>
            ) : (
              <Grid>
                {currentSection.groups.map(group => (
                  <Grid.Col key={group.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card withBorder radius="md" p="md">
                      <Group justify="space-between" mb="xs">
                        <Text fw={700}>{group.name}</Text>
                        <Badge variant="light" color="orange" size="sm">
                          {group.results.length}/{group.capacity}
                        </Badge>
                      </Group>

                      <Table striped withRowBorders={false} verticalSpacing={4}>
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
                                <Text size="xs" c="dimmed" fw={600}>{r.position}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs" wrap="nowrap">
                                  {r.raffleTeam.imagePath && (
                                    <Image src={getImageUrl(r.raffleTeam.imagePath)} w={20} h={20} fit="contain" />
                                  )}
                                  <Text size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {r.raffleTeam.abbreviation}
                                  </Text>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                          {Array.from({ length: group.capacity - group.results.length }).map((_, i) => (
                            <Table.Tr key={`empty-${i}`}>
                              <Table.Td><Text size="xs" c="dimmed">{group.results.length + i + 1}</Text></Table.Td>
                              <Table.Td><Text size="sm" c="dimmed" fs="italic">—</Text></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}