import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Text, Button, Group, Stack, Card, Center, Loader,
  Modal, SimpleGrid, Badge, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconArrowBackUp, IconEye } from '@tabler/icons-react';
import { drawApi } from '@/api/drawApi';
import { sportApi } from '@/api/sportApi';
import { notifications } from '@mantine/notifications';
import type {
  Raffle, Sport, SportCategory, FullDrawState, RaffleTeam, SportCategoryGroup,
} from '@/types/api.types';

// ── SlotMachine ───────────────────────────────────────────────────────────────
interface SlotMachineProps {
  items: RaffleTeam[];
  spinning: boolean;
  result: RaffleTeam | null;
  onSpin: () => void;
}

function SlotMachine({ items, spinning, result, onSpin }: SlotMachineProps) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (spinning && items.length > 0) {
      frameRef.current = 0;
      intervalRef.current = setInterval(() => {
        frameRef.current++;
        setDisplayIdx(Math.floor(Math.random() * items.length));
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [spinning, items]);

  const displayed = result ?? (items.length > 0 ? items[displayIdx % items.length] : null);

  return (
    <Stack align="center" gap="lg">
      <Card
        withBorder
        radius="xl"
        p={0}
        style={{
          width: '100%',
          maxWidth: 320,
          height: 160,
          overflow: 'hidden',
          border: spinning ? '3px solid var(--mantine-color-orange-5)' : '3px solid var(--mantine-color-default-border)',
          transition: 'border-color 300ms',
          cursor: items.length > 0 && !result ? 'pointer' : 'default',
        }}
        onClick={() => { if (items.length > 0 && !result) onSpin(); }}
      >
        <Center h="100%">
          {!displayed ? (
            <Text c="dimmed">Sin equipos</Text>
          ) : (
            <Stack align="center" gap="xs" p="md">
              <Text fw={900} size="xl" ta="center" style={{ transition: spinning ? 'none' : 'all 300ms' }}>
                {displayed.abbreviation}
              </Text>
              <Text size="sm" ta="center" c="dimmed" lineClamp={2}>
                {displayed.name}
              </Text>
            </Stack>
          )}
        </Center>
      </Card>

      {!result && (
        <Text size="xs" c="dimmed" ta="center">
          {spinning ? 'Tocá para detener...' : 'Tocá el cilindro para sortear'}
        </Text>
      )}

      {result && (
        <Badge color="green" size="lg" variant="light">¡{result.name} sorteado!</Badge>
      )}
    </Stack>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function DrawPage() {
  const { drawSlug } = useParams<{ drawSlug: string }>();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsWithCategories, setSportsWithCategories] = useState<Map<string, SportCategory[]>>(new Map());
  const [fullState, setFullState] = useState<FullDrawState | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [drawnTeam, setDrawnTeam] = useState<RaffleTeam | null>(null);
  const [, setDrawnGroup] = useState<SportCategoryGroup | null>(null);
  const [phase, setPhase] = useState<'select_sport' | 'select_category' | 'draw_team' | 'draw_group' | 'done'>('select_sport');
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SportCategory | null>(null);
  const [undoOpened, { open: openUndo, close: closeUndo }] = useDisclosure(false);
  const [undoing, setUndoing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!drawSlug) return;
    try {
      const r = await drawApi.getByDrawSlug(drawSlug);
      setRaffle(r);
      const [sportsData, state] = await Promise.all([
        sportApi.getByRaffle(r.id),
        drawApi.getState(r.id),
      ]);
      const catMap = new Map<string, SportCategory[]>();
      await Promise.all(sportsData.map(async s => {
        const cats = await sportApi.getCategories(s.id);
        catMap.set(s.id, cats);
      }));
      setSports(sportsData);
      setSportsWithCategories(catMap);
      setFullState(state);

      // Restore state
      if (state?.state?.phase === 'picking_team' && state.state.currentSportId) {
        const sport = sportsData.find(s => s.id === state.state!.currentSportId);
        const cat = state.state.currentSportCategoryId
          ? catMap.get(state.state.currentSportId!)?.find(c => c.id === state.state!.currentSportCategoryId)
          : null;
        setSelectedSport(sport ?? null);
        setSelectedCategory(cat ?? null);
        setPhase('draw_team');
      } else if (state?.state?.phase === 'picking_group') {
        const sport = sportsData.find(s => s.id === state.state!.currentSportId);
        const cat = state.state.currentSportCategoryId
          ? catMap.get(state.state.currentSportId!)?.find(c => c.id === state.state!.currentSportCategoryId)
          : null;
        setSelectedSport(sport ?? null);
        setSelectedCategory(cat ?? null);
        setDrawnTeam(state.state.drawnTeam);
        setPhase('draw_group');
      } else {
        setPhase('select_sport');
      }
    } catch {
      notifications.show({ message: 'Error al cargar el sorteo', color: 'red' });
    } finally { setLoading(false); }
  }, [drawSlug]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const remainingSports = sports.filter(s => {
    const cats = sportsWithCategories.get(s.id) ?? [];
    if (cats.length === 0) {
      return true;
    }
    return cats.some(() => true);
  });

  const handleSelectSport = async (sport: Sport) => {
    const cats = sportsWithCategories.get(sport.id) ?? [];
    setSelectedSport(sport);
    if (cats.length === 0) {
      const state = await drawApi.selectContext(raffle!.id, sport.id);
      setFullState(state);
      setDrawnTeam(null);
      setPhase('draw_team');
    } else {
      setPhase('select_category');
    }
  };

  const handleSelectCategory = async (cat: SportCategory) => {
    setSelectedCategory(cat);
    const state = await drawApi.selectContext(raffle!.id, selectedSport!.id, cat.id);
    setFullState(state);
    setDrawnTeam(null);
    setPhase('draw_team');
  };

  const handleSpinTeam = async () => {
    if (spinning) {
      setSpinning(false);
      try {
        const res = await drawApi.drawTeam(raffle!.id);
        setDrawnTeam(res.team);
        const newState = await drawApi.getState(raffle!.id);
        setFullState(newState);
        setPhase('draw_group');
      } catch {
        notifications.show({ message: 'Error al sortear equipo', color: 'red' });
      }
    } else {
      setSpinning(true);
    }
  };

  const handleSpinGroup = async () => {
    if (spinning) {
      setSpinning(false);
      try {
        const res = await drawApi.drawGroup(raffle!.id);
        const group = res.result.sportCategoryGroup;
        setDrawnGroup(group);
        notifications.show({ message: `${drawnTeam?.abbreviation} → ${group.name}`, color: 'green' });
        if (res.isDone) {
          setPhase('select_sport');
          setSelectedSport(null);
          setSelectedCategory(null);
        } else {
          setDrawnTeam(null);
          setDrawnGroup(null);
          const newState = await drawApi.getState(raffle!.id);
          setFullState(newState);
          setPhase('draw_team');
        }
      } catch {
        notifications.show({ message: 'Error al sortear grupo', color: 'red' });
      }
    } else {
      setSpinning(true);
    }
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      const newState = await drawApi.undo(raffle!.id);
      setFullState(newState);
      setDrawnTeam(null);
      setDrawnGroup(null);
      setPhase('draw_team');
      closeUndo();
      notifications.show({ message: 'Último sorteo deshecho', color: 'blue' });
    } catch {
      notifications.show({ message: 'Error al deshacer', color: 'red' });
    } finally { setUndoing(false); }
  };

  const remainingTeams = (fullState?.remainingTeams ?? []) as RaffleTeam[];
  const remainingGroups = (fullState?.remainingGroups ?? []) as SportCategoryGroup[];
  const totalResults = (fullState?.results ?? []).length;
  const allDone = sports.length > 0 && remainingSports.length === 0;

  if (loading) return <Center h="100dvh"><Loader color="orange" size="lg" /></Center>;
  if (!raffle) return <Center h="100dvh"><Text>Sorteo no encontrado.</Text></Center>;

  return (
    <Box mih="100dvh" style={{ background: 'var(--mantine-color-body)', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', position: 'sticky', top: 0, background: 'var(--mantine-color-body)', zIndex: 10 }}>
        <Group justify="space-between">
          <Group gap="xs">
            <Button size="xs" variant="subtle" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate('/raffles')}>
              Panel
            </Button>
          </Group>
          <Text fw={600} size="sm" ta="center" style={{ flex: 1 }}>{raffle.name}</Text>
          <Group gap="xs">
            {raffle.publicSlug && (
              <Button size="xs" variant="subtle" leftSection={<IconEye size={14} />}
                onClick={() => window.open(`/s/${raffle.publicSlug}`, '_blank')}>
                Ver tablas
              </Button>
            )}
          </Group>
        </Group>
        {totalResults > 0 && (
          <Group justify="center" mt="xs">
            <Badge color="orange" variant="light">{totalResults} sorteos realizados</Badge>
          </Group>
        )}
      </Box>

      <Stack p="md" gap="lg">
        {/* All done */}
        {allDone ? (
          <Card withBorder radius="xl" p="xl" ta="center">
            <Stack align="center" gap="md">
              <Text size="3rem">🎉</Text>
              <Title order={3}>¡Sorteo completado!</Title>
              <Text c="dimmed">Todos los equipos han sido sorteados en sus grupos.</Text>
              {raffle.publicSlug && (
                <Button color="orange" leftSection={<IconEye size={16} />}
                  onClick={() => window.open(`/s/${raffle.publicSlug}`, '_blank')}>
                  Ver resultados finales
                </Button>
              )}
            </Stack>
          </Card>
        ) : phase === 'select_sport' ? (
          <Stack>
            <Text fw={600} ta="center">Seleccioná un deporte</Text>
            <SimpleGrid cols={2}>
              {sports.map(s => (
                <Card key={s.id} withBorder radius="md" p="lg" ta="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => void handleSelectSport(s)}>
                  <Text fw={700} size="xl">{s.abbreviation}</Text>
                  <Text size="xs" c="dimmed">{s.name}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : phase === 'select_category' ? (
          <Stack>
            <Button variant="subtle" size="sm" onClick={() => { setSelectedSport(null); setPhase('select_sport'); }}>
              ← Volver
            </Button>
            <Text fw={600} ta="center">Seleccioná una categoría — {selectedSport?.name}</Text>
            <SimpleGrid cols={2}>
              {(sportsWithCategories.get(selectedSport?.id ?? '') ?? []).map(cat => (
                <Card key={cat.id} withBorder radius="md" p="lg" ta="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => void handleSelectCategory(cat)}>
                  <Text fw={600}>{cat.name}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : phase === 'draw_team' ? (
          <Stack>
            <Text fw={600} ta="center" size="lg">
              Eligiendo equipo — {selectedSport?.name}{selectedCategory ? ` ${selectedCategory.name}` : ''}
            </Text>
            <Text size="sm" c="dimmed" ta="center">{remainingTeams.length} equipos restantes</Text>
            <SlotMachine
              items={remainingTeams}
              spinning={spinning}
              result={null}
              onSpin={() => void handleSpinTeam()}
            />
            {spinning && (
              <Button size="lg" color="orange" onClick={() => void handleSpinTeam()}>
                ¡Parar!
              </Button>
            )}
            {!spinning && (
              <Button size="lg" color="orange" onClick={() => void handleSpinTeam()}>
                Girar
              </Button>
            )}
          </Stack>
        ) : phase === 'draw_group' ? (
          <Stack>
            <Text fw={600} ta="center" size="lg">
              Sorteando grupo para {drawnTeam?.abbreviation}
            </Text>
            <Text size="sm" c="dimmed" ta="center">{remainingGroups.length} grupos disponibles</Text>
            <SlotMachine
              items={remainingGroups.map(g => ({ id: g.id, name: g.name, abbreviation: g.name, raffleId: raffle.id, imagePath: null, createdAt: '', updatedAt: '' }))}
              spinning={spinning}
              result={null}
              onSpin={() => void handleSpinGroup()}
            />
            {spinning && (
              <Button size="lg" color="orange" onClick={() => void handleSpinGroup()}>
                ¡Parar!
              </Button>
            )}
            {!spinning && (
              <Button size="lg" color="orange" onClick={() => void handleSpinGroup()}>
                Girar
              </Button>
            )}
          </Stack>
        ) : null}

        {/* Undo */}
        {totalResults > 0 && !allDone && (
          <Button variant="subtle" color="red" size="sm" leftSection={<IconArrowBackUp size={14} />}
            onClick={openUndo}>
            Deshacer último sorteo
          </Button>
        )}
      </Stack>

      <Modal opened={undoOpened} onClose={closeUndo} title="Deshacer último sorteo" centered>
        <Stack>
          <Text>¿Estás seguro que querés deshacer el último sorteo realizado?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeUndo}>Cancelar</Button>
            <Button color="red" loading={undoing} onClick={() => void handleUndo()}>
              Deshacer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}