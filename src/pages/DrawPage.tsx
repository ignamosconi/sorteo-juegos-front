import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Text, Button, Group, Stack, Card, Center, Loader,
  Modal, SimpleGrid, Badge, Title, Paper, Divider, Table, Image,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft, IconArrowBackUp, IconEye, IconTrophy,
  IconShield, IconSparkles, IconPlayerPlay, IconCheck,
  IconCaretRightFilled, IconCaretLeftFilled,
} from '@tabler/icons-react';
import { drawApi } from '@/api/drawApi';
import { sportApi } from '@/api/sportApi';
import { notifications } from '@mantine/notifications';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getImageUrl } from '@/utils/imageUrl';
import type {
  Raffle, Sport, SportCategory, FullDrawState, RaffleTeam,
  SportCategoryGroup, DrawResult, PublicResultsResponse,
} from '@/types/api.types';

const notifyPublicUpdate = () => {
  window.dispatchEvent(new CustomEvent('raffle_draw_updated'));
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel('raffle_draw_channel');
    bc.postMessage('updated');
    bc.close();
  }
};

// ── Visor Cilindro Tragaperras 3D Continuo (Supersampling 2X) ───────────────
interface Cylinder3DProps<T> {
  items: T[];
  spinning: boolean;
  targetIndex: number | null;
  onLockedIn: () => void;
  renderItem: (item: T) => React.ReactNode;
}

function Cylinder3D<T>({
  items,
  spinning,
  targetIndex,
  onLockedIn,
  renderItem,
}: Cylinder3DProps<T>) {
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedTriggeredRef = useRef(false);

  const onLockedInRef = useRef(onLockedIn);
  useEffect(() => {
    onLockedInRef.current = onLockedIn;
  }, [onLockedIn]);

  const [displayAngle, setDisplayAngle] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const faceCount = Math.max(14, items.length > 0 ? Math.ceil(14 / items.length) * items.length : 14);
  const faceAngle = 360 / faceCount;
  
  // Geometría escalada a 2X para Supersampling (HD)
  const itemHeight = 96; // 48 * 2
  const radius = Math.round((itemHeight / 2) / Math.tan(Math.PI / faceCount));

  const extendedItems: T[] = [];
  if (items.length > 0) {
    while (extendedItems.length < faceCount) {
      extendedItems.push(...items);
    }
  }
  const finalItems = extendedItems.slice(0, faceCount);

  useEffect(() => {
    setIsLocked(false);
    lockedTriggeredRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let targetAngle: number | null = null;

    const animate = () => {
      if (spinning && targetIndex === null) {
        speedRef.current = Math.min(speedRef.current + 0.2, 3.8);
        angleRef.current = (angleRef.current + speedRef.current) % 360;
      } else if (targetIndex !== null && items.length > 0) {
        const realTargetFace = targetIndex % faceCount;
        const targetFaceAngle = (360 - realTargetFace * faceAngle) % 360;

        if (targetAngle === null) {
          const currentModulo = angleRef.current % 360;
          let diff = targetFaceAngle - currentModulo;
          if (diff <= 0) diff += 360;
          targetAngle = angleRef.current + diff + 360 * 2;
        }

        const remaining = targetAngle - angleRef.current;
        if (remaining > 0.3) {
          speedRef.current = Math.max(remaining * 0.045, 0.3);
          angleRef.current += speedRef.current;
        } else {
          angleRef.current = targetAngle % 360;
          setDisplayAngle(angleRef.current);
          setIsLocked(true);

          if (!lockedTriggeredRef.current) {
            lockedTriggeredRef.current = true;
            timeoutRef.current = setTimeout(() => {
              onLockedInRef.current();
            }, 1000);
          }
          return;
        }
      } else {
        speedRef.current = 0;
      }

      setDisplayAngle(angleRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [spinning, targetIndex, faceAngle, faceCount, items]);

  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        height: 220,
        margin: '0 auto',
        perspective: '1600px',
        overflow: 'hidden',
        borderRadius: '16px',
        border: isLocked
          ? '3px solid var(--mantine-color-green-5)'
          : spinning
          ? '3px solid var(--mantine-color-orange-5)'
          : '3px solid var(--mantine-color-default-border)',
        boxShadow: isLocked
          ? '0 0 25px rgba(40, 199, 111, 0.4)'
          : spinning
          ? '0 0 25px rgba(245, 167, 5, 0.4)'
          : 'var(--mantine-shadow-md)',
        transition: 'border-color 300ms, box-shadow 300ms',
        background: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))',
        isolation: 'isolate',
      }}
    >
      {/* Sombras superior e inferior */}
      <Box
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 70,
          background: 'linear-gradient(to bottom, light-dark(rgba(240,240,240,0.98), rgba(20,20,20,0.98)), transparent)',
          zIndex: 5, pointerEvents: 'none',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: 70,
          background: 'linear-gradient(to top, light-dark(rgba(240,240,240,0.98), rgba(20,20,20,0.98)), transparent)',
          zIndex: 5, pointerEvents: 'none',
        }}
      />

      {/* Flecha Izquierda */}
      <Box
        style={{
          position: 'absolute',
          left: 6,
          top: '50%',
          marginTop: -16,
          zIndex: 6,
          pointerEvents: 'none',
          color: isLocked
            ? 'var(--mantine-color-green-5)'
            : spinning
            ? 'var(--mantine-color-orange-5)'
            : 'var(--mantine-color-gray-5)',
          transition: 'color 300ms',
          animation: isLocked ? 'arrowPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
        }}
      >
        <IconCaretRightFilled size={32} />
      </Box>

      {/* Flecha Derecha */}
      <Box
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          marginTop: -16,
          zIndex: 6,
          pointerEvents: 'none',
          color: isLocked
            ? 'var(--mantine-color-green-5)'
            : spinning
            ? 'var(--mantine-color-orange-5)'
            : 'var(--mantine-color-gray-5)',
          transition: 'color 300ms',
          animation: isLocked ? 'arrowPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
        }}
      >
        <IconCaretLeftFilled size={32} />
      </Box>

      {/* Recuadro del Ganador (Aparece únicamente cuando isLocked es true) */}
      {isLocked && (
        <Box
          style={{
            position: 'absolute',
            top: '50%', left: 0, right: 0, height: 56,
            marginTop: -28,
            borderTop: '2px solid var(--mantine-color-green-5)',
            borderBottom: '2px solid var(--mantine-color-green-5)',
            borderLeft: 'none',
            borderRight: 'none',
            background: 'rgba(40, 199, 111, 0.12)',
            zIndex: 4, pointerEvents: 'none',
            boxShadow: '0 0 15px rgba(40,199,111,0.5), inset 0 0 12px rgba(40,199,111,0.15)',
            animation: 'framePopIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        />
      )}

      <style>{`
        @keyframes arrowPop {
          0% { transform: scale(0.7); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1.1); }
        }
        @keyframes framePopIn {
          0% { transform: scaleY(0); opacity: 0; }
          60% { transform: scaleY(1.1); opacity: 0.9; }
          100% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      {/* Escenario 3D a resolución 2X renderizado y reescalado a 0.5X */}
      <Box
        style={{
          width: '200%',
          height: '200%',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          transformStyle: 'preserve-3d',
          transform: `scale(0.5) rotateX(${displayAngle}deg)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {finalItems.map((item, idx) => {
          const itemAngle = idx * faceAngle;
          return (
            <Box
              key={idx}
              style={{
                position: 'absolute',
                left: '5%',
                top: '50%',
                width: '90%',
                height: itemHeight,
                marginTop: -itemHeight / 2,
                backfaceVisibility: 'hidden',
                transform: `rotateX(${itemAngle}deg) translateZ(${radius}px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitFontSmoothing: 'antialiased',
                textRendering: 'geometricPrecision',
              }}
            >
              <Paper
                radius="md"
                p="xs"
                w="100%"
                h="100%"
                style={{
                  background: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))',
                  textAlign: 'center',
                  boxShadow: 'var(--mantine-shadow-xs)',
                  borderLeft: '1px solid var(--mantine-color-default-border)',
                  borderRight: '1px solid var(--mantine-color-default-border)',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  borderTop: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderItem(item)}
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Página Principal de Sorteo ─────────────────────────────────────────────
export function DrawPage() {
  const { drawSlug } = useParams<{ drawSlug: string }>();
  const navigate = useNavigate();

  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsWithCategories, setSportsWithCategories] = useState<Map<string, SportCategory[]>>(new Map());
  const [fullState, setFullState] = useState<FullDrawState | null>(null);
  const [publicData, setPublicData] = useState<PublicResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SportCategory | null>(null);
  const [phase, setPhase] = useState<'select_sport' | 'select_category' | 'drawing'>('select_sport');

  const [drawingStage, setDrawingStage] = useState<'team' | 'group'>('team');
  const [spinning, setSpinning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [drawnTeam, setDrawnTeam] = useState<RaffleTeam | null>(null);
  const [drawnResult, setDrawnResult] = useState<DrawResult | null>(null);

  // Cerrojo de seguridad para evitar sorteos duplicados en categorías con 1 solo grupo
  const isAutoDrawingGroupRef = useRef(false);

  const [teamModalOpened, { open: openTeamModal, close: closeTeamModal }] = useDisclosure(false);
  const [resultModalOpened, { open: openResultModal, close: closeResultModal }] = useDisclosure(false);
  const [undoOpened, { open: openUndo, close: closeUndo }] = useDisclosure(false);
  const [undoing, setUndoing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!drawSlug) return;
    try {
      const r = await drawApi.getByDrawSlug(drawSlug);
      setRaffle(r);
      const [sportsData, state, pubData] = await Promise.all([
        sportApi.getByRaffle(r.id),
        drawApi.getState(r.id),
        r.publicSlug ? drawApi.getPublicResults(r.publicSlug) : Promise.resolve(null),
      ]);
      const catMap = new Map<string, SportCategory[]>();
      await Promise.all(
        sportsData.map(async (s) => {
          const cats = await sportApi.getCategories(s.id);
          catMap.set(s.id, cats);
        })
      );
      setSports(sportsData);
      setSportsWithCategories(catMap);
      setFullState(state);
      if (pubData) setPublicData(pubData);

      if (state?.state?.currentSportId) {
        const sport = sportsData.find((s) => s.id === state.state!.currentSportId);
        const cat = state.state.currentSportCategoryId
          ? catMap.get(state.state.currentSportId!)?.find((c) => c.id === state.state!.currentSportCategoryId)
          : null;
        setSelectedSport(sport ?? null);
        setSelectedCategory(cat ?? null);
        setPhase('drawing');
        setDrawingStage(state.state.phase === 'picking_group' ? 'group' : 'team');
        if (state.state.drawnTeam) {
          setDrawnTeam(state.state.drawnTeam);
        }
      } else {
        setPhase('select_sport');
      }
    } catch {
      notifications.show({ message: 'Error al cargar el sorteo', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [drawSlug]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshPublicData = useCallback(async () => {
    if (raffle?.publicSlug) {
      try {
        const pubData = await drawApi.getPublicResults(raffle.publicSlug);
        setPublicData(pubData);
      } catch {
        // ignorar
      }
    }
  }, [raffle]);

  const remainingTeams = (fullState?.remainingTeams ?? []) as RaffleTeam[];
  const remainingGroups = (fullState?.remainingGroups ?? []) as SportCategoryGroup[];

  const isCategoryFinished = drawingStage === 'team' && remainingTeams.length === 0;

  const isCategoryCompleted = useCallback((sportId: string, categoryId: string | null): boolean => {
    if (!publicData) return false;
    const sData = publicData.sports.find((s) => s.sport.id === sportId);
    if (!sData) return false;
    const section = sData.sections.find((sec) => (sec.category?.id ?? null) === categoryId);
    if (!section || section.groups.length === 0) return false;
    return section.groups.every((g) => g.results.length >= g.capacity);
  }, [publicData]);

  const isSportCompleted = useCallback((sportId: string): boolean => {
    if (!publicData) return false;
    const sData = publicData.sports.find((s) => s.sport.id === sportId);
    if (!sData) return false;
    const allGroups = sData.sections.flatMap((sec) => sec.groups);
    if (allGroups.length === 0) return false;
    return allGroups.every((g) => g.results.length >= g.capacity);
  }, [publicData]);

  const getCategoryTotalGroupsCount = useCallback((): number => {
    if (!selectedSport || !publicData) return 0;
    const sData = publicData.sports.find((s) => s.sport.id === selectedSport.id);
    if (!sData) return 0;
    const targetCatId = selectedCategory?.id ?? null;
    const section = sData.sections.find((sec) => (sec.category?.id ?? null) === targetCatId);
    return section?.groups.length ?? 0;
  }, [selectedSport, selectedCategory, publicData]);

  const hasSingleGroupInCategory = getCategoryTotalGroupsCount() === 1;

  const handleSelectSport = async (sport: Sport) => {
    const cats = sportsWithCategories.get(sport.id) ?? [];
    setSelectedSport(sport);
    if (cats.length === 0) {
      const state = await drawApi.selectContext(raffle!.id, sport.id);
      setFullState(state);
      setDrawnTeam(null);
      setDrawingStage('team');
      setPhase('drawing');
    } else {
      setPhase('select_category');
    }
  };

  const handleSelectCategory = async (cat: SportCategory) => {
    setSelectedCategory(cat);
    const state = await drawApi.selectContext(raffle!.id, selectedSport!.id, cat.id);
    setFullState(state);
    setDrawnTeam(null);
    setDrawingStage('team');
    setPhase('drawing');
  };

  // ── 1. Sorteo de Equipo ──
  const handleStartSpin = () => {
    setSpinning(true);
    setIsProcessing(true);
    setTargetIndex(null);
  };

  const handleDrawTeam = async () => {
    if (spinning || isProcessing) return;
    isAutoDrawingGroupRef.current = false;
    handleStartSpin();
    try {
      const res = await drawApi.drawTeam(raffle!.id);
      const idx = remainingTeams.findIndex((t) => t.id === res.team.id);
      setDrawnTeam(res.team);
      setTargetIndex(idx >= 0 ? idx : 0);
    } catch (err: any) {
      setSpinning(false);
      setIsProcessing(false);
      notifications.show({
        message: err?.response?.data?.message || 'Error al sortear equipo',
        color: 'red',
      });
    }
  };

  const handleTeamLockedIn = useCallback(async () => {
    setSpinning(false);
    setIsProcessing(false);

    if (hasSingleGroupInCategory) {
      if (isAutoDrawingGroupRef.current) return;
      isAutoDrawingGroupRef.current = true;

      try {
        const res = await drawApi.drawGroup(raffle!.id);
        setDrawnResult(res.result);
        const newState = await drawApi.getState(raffle!.id);
        setFullState(newState);
        notifyPublicUpdate();
        void refreshPublicData();
        openResultModal();
      } catch (err: any) {
        isAutoDrawingGroupRef.current = false;
        notifications.show({
          message: err?.response?.data?.message || 'Error al asignar grupo',
          color: 'red',
        });
      }
    } else {
      openTeamModal();
    }
  }, [hasSingleGroupInCategory, raffle, openResultModal, openTeamModal, refreshPublicData]);

  // ── 2. Sorteo de Grupo ──
  const handlePrepareGroupDraw = () => {
    closeTeamModal();
    setDrawingStage('group');
    setTargetIndex(null);
  };

  const handleDrawGroup = async () => {
    if (spinning || isProcessing) return;
    handleStartSpin();
    try {
      const res = await drawApi.drawGroup(raffle!.id);
      const idx = remainingGroups.findIndex((g) => g.id === res.result.sportCategoryGroupId);
      setDrawnResult(res.result);
      setTargetIndex(idx >= 0 ? idx : 0);
    } catch (err: any) {
      setSpinning(false);
      setIsProcessing(false);
      notifications.show({
        message: err?.response?.data?.message || 'Error al sortear grupo',
        color: 'red',
      });
    }
  };

  const handleGroupLockedIn = useCallback(async () => {
    setSpinning(false);
    setIsProcessing(false);
    if (!raffle) return;
    const newState = await drawApi.getState(raffle.id);
    setFullState(newState);
    notifyPublicUpdate();
    void refreshPublicData();
    openResultModal();
  }, [raffle, openResultModal, refreshPublicData]);

  const handleNextTeamDraw = () => {
    closeResultModal();
    setDrawnTeam(null);
    setDrawnResult(null);
    setTargetIndex(null);
    setDrawingStage('team');

    if (remainingTeams.length === 0) {
      setSelectedSport(null);
      setSelectedCategory(null);
      setPhase('select_sport');
    }
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      const newState = await drawApi.undo(raffle!.id);
      setFullState(newState);
      setDrawnTeam(null);
      setDrawnResult(null);
      setTargetIndex(null);
      setSpinning(false);
      setIsProcessing(false);
      setDrawingStage('team');
      notifyPublicUpdate();
      void refreshPublicData();
      closeUndo();
      notifications.show({ message: 'Último sorteo deshecho', color: 'blue' });
    } catch {
      notifications.show({ message: 'Error al deshacer el sorteo', color: 'red' });
    } finally {
      setUndoing(false);
    }
  };

  const selectedGroup = drawnResult?.sportCategoryGroup;
  const groupResults = (fullState?.results ?? [])
    .filter((r) => r.sportCategoryGroupId === selectedGroup?.id)
    .sort((a, b) => a.position - b.position);

  if (loading) return <Center h="100dvh"><Loader color="orange" size="lg" /></Center>;
  if (!raffle) return <Center h="100dvh"><Text>Sorteo no encontrado.</Text></Center>;

  return (
    <Box mih="100dvh" style={{ background: 'var(--mantine-color-body)' }}>
      {/* Navbar Superior */}
      <Box
        p="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          position: 'sticky', top: 0,
          background: 'var(--mantine-color-body)', zIndex: 10,
        }}
      >
        <Group justify="space-between" maw={1000} mx="auto">
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate('/raffles')}
            >
              Panel
            </Button>
            <Title order={4}>{raffle.name}</Title>
          </Group>

          <Group gap="xs">
            <ThemeToggle />
            {raffle.publicSlug && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconEye size={14} />}
                onClick={() => window.open(`/s/${raffle.publicSlug}`, '_blank')}
              >
                Ver tablas públicas
              </Button>
            )}
          </Group>
        </Group>
      </Box>

      {/* Contenedor Principal */}
      <Box maw={600} mx="auto" p="md">
        <Stack gap="lg">
          {phase === 'select_sport' ? (
            <Card withBorder radius="lg" p="xl">
              <Stack gap="md">
                <Text fw={700} ta="center" size="lg">Seleccioná un Deporte para Sortear</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {sports.map((s) => {
                    const completed = isSportCompleted(s.id);
                    return (
                      <Card
                        key={s.id}
                        withBorder
                        radius="md"
                        p="lg"
                        style={{
                          cursor: 'pointer',
                          transition: 'transform 150ms',
                          borderColor: completed ? 'var(--mantine-color-green-5)' : undefined,
                          background: completed
                            ? 'light-dark(rgba(40, 199, 111, 0.08), rgba(40, 199, 111, 0.15))'
                            : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 110,
                        }}
                        onClick={() => void handleSelectSport(s)}
                      >
                        <Stack gap={6} align="center" justify="center" w="100%">
                          <Text fw={800} size="xl" ta="center">{s.name.toUpperCase()}</Text>
                          {completed && (
                            <Badge
                              color="green"
                              variant="light"
                              size="sm"
                              leftSection={<IconCheck size={12} />}
                            >
                              Sorteo Finalizado
                            </Badge>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Card>
          ) : phase === 'select_category' ? (
            <Card withBorder radius="lg" p="xl">
              <Stack gap="md">
                <Button variant="subtle" size="xs" onClick={() => setPhase('select_sport')}>
                  ← Volver a deportes
                </Button>
                <Text fw={700} ta="center" size="lg">
                  Seleccioná Categoría — {selectedSport?.name}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {(sportsWithCategories.get(selectedSport?.id ?? '') ?? []).map((cat) => {
                    const completed = isCategoryCompleted(selectedSport!.id, cat.id);
                    return (
                      <Card
                        key={cat.id}
                        withBorder
                        radius="md"
                        p="lg"
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 100,
                          borderColor: completed ? 'var(--mantine-color-green-5)' : undefined,
                          background: completed
                            ? 'light-dark(rgba(40, 199, 111, 0.08), rgba(40, 199, 111, 0.15))'
                            : undefined,
                        }}
                        onClick={() => void handleSelectCategory(cat)}
                      >
                        <Stack gap={6} align="center" justify="center" w="100%">
                          <Text fw={700} ta="center">{cat.name}</Text>
                          {completed && (
                            <Badge
                              color="green"
                              variant="light"
                              size="sm"
                              leftSection={<IconCheck size={12} />}
                            >
                              Sorteo Finalizado
                            </Badge>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Card>
          ) : (
            <Card withBorder radius="lg" p="xl">
              <Stack gap="lg" align="center">
                <Group justify="space-between" w="100%">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => {
                      setSelectedSport(null);
                      setSelectedCategory(null);
                      setPhase('select_sport');
                    }}
                  >
                    ← Cambiar deporte
                  </Button>
                  <Badge color="orange" variant="light" size="lg">
                    {selectedSport?.name} {selectedCategory ? `• ${selectedCategory.name}` : ''}
                  </Badge>
                </Group>

                {isCategoryFinished ? (
                  <Paper
                    withBorder
                    radius="md"
                    p="xl"
                    w="100%"
                    ta="center"
                    style={{ background: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))' }}
                  >
                    <Stack align="center" gap="xs">
                      <IconCheck size={48} color="var(--mantine-color-green-5)" />
                      <Title order={3}>Sorteo Finalizado</Title>
                      <Text c="dimmed" size="sm">
                        Esta categoría ya se terminó de sortear.
                      </Text>
                    </Stack>
                  </Paper>
                ) : (
                  <>
                    <Box ta="center">
                      <Title order={3}>
                        {drawingStage === 'team' ? 'Sortear Equipo' : `Sortear Grupo para ${drawnTeam?.abbreviation}`}
                      </Title>
                      <Text size="sm" c="dimmed" mt={4}>
                        {drawingStage === 'team'
                          ? `${remainingTeams.length} equipos en la bolsa`
                          : `${remainingGroups.length} grupos con vacantes disponibles`}
                      </Text>
                    </Box>

                    {/* VISOR CILINDRO 3D */}
                    {drawingStage === 'team' ? (
                      <Cylinder3D
                        items={remainingTeams}
                        spinning={spinning}
                        targetIndex={targetIndex}
                        onLockedIn={() => void handleTeamLockedIn()}
                        renderItem={(team) => (
                          <Box style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Box style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '195px' }}>
                              <Box style={{ width: '80px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {team.imagePath && (
                                  <Image
                                    src={getImageUrl(team.imagePath)}
                                    h={72}
                                    w={72}
                                    fit="contain"
                                  />
                                )}
                              </Box>
                              <Text fw={800} style={{ whiteSpace: 'nowrap', fontSize: '38px', textAlign: 'left' }}>
                                {team.abbreviation}
                              </Text>
                            </Box>
                          </Box>
                        )}
                      />
                    ) : (
                      <Cylinder3D
                        items={remainingGroups}
                        spinning={spinning}
                        targetIndex={targetIndex}
                        onLockedIn={() => void handleGroupLockedIn()}
                        renderItem={(group) => (
                          <Text fw={800} style={{ fontSize: '48px' }}>
                            {group.name}
                          </Text>
                        )}
                      />
                    )}

                    {/* BOTÓN GIRAR CILINDRO */}
                    <Group justify="center" w="100%">
                      {!spinning ? (
                        <Button
                          size="xl"
                          color="orange"
                          radius="md"
                          fullWidth
                          disabled={isProcessing}
                          leftSection={<IconPlayerPlay size={20} />}
                          onClick={() => {
                            if (drawingStage === 'team') {
                              void handleDrawTeam();
                            } else {
                              void handleDrawGroup();
                            }
                          }}
                        >
                          Girar Cilindro
                        </Button>
                      ) : (
                        <Button size="xl" color="orange" radius="md" fullWidth loading>
                          Sorteando {drawingStage === 'team' ? 'equipo' : 'grupo'}...
                        </Button>
                      )}
                    </Group>
                  </>
                )}

                {fullState?.results && fullState.results.length > 0 && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    disabled={isProcessing}
                    leftSection={<IconArrowBackUp size={14} />}
                    onClick={openUndo}
                  >
                    Deshacer último sorteo
                  </Button>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Box>

      {/* MODAL 1: Equipo Sorteado */}
      <Modal
        opened={teamModalOpened}
        onClose={() => {}}
        withCloseButton={false}
        centered
        radius="lg"
      >
        <Stack align="center" gap="md" py="md">
          <IconSparkles size={48} color="var(--mantine-color-orange-5)" />
          <Text size="sm" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.05em' }}>
            ¡Equipo Sorteado!
          </Text>

          {drawnTeam?.imagePath ? (
            <Image
              src={getImageUrl(drawnTeam.imagePath)}
              h={90}
              w={90}
              fit="contain"
              mx="auto"
            />
          ) : (
            <Box p="md" style={{ borderRadius: '50%', background: 'var(--mantine-color-orange-light)' }}>
              <IconShield size={48} color="var(--mantine-color-orange-6)" />
            </Box>
          )}

          <Box ta="center">
            <Title order={2}>{drawnTeam?.name}</Title>
            <Badge color="orange" size="lg" variant="light" mt={4}>
              {drawnTeam?.abbreviation}
            </Badge>
          </Box>

          <Button
            size="lg"
            color="orange"
            fullWidth
            mt="md"
            onClick={handlePrepareGroupDraw}
          >
            Sortear Grupo
          </Button>
        </Stack>
      </Modal>

      {/* MODAL 2: Tabla e Información del Grupo */}
      <Modal
        opened={resultModalOpened && !!drawnResult}
        onClose={() => {}}
        withCloseButton={false}
        centered
        size="lg"
        radius="lg"
      >
        <Stack align="center" gap="md" py="sm">
          <IconTrophy size={42} color="var(--mantine-color-green-5)" />

          {/* Información de la Facultad Sorteada */}
          <Paper withBorder p="md" radius="md" w="100%" ta="center">
            <Group justify="center" gap="sm">
              {(drawnResult?.raffleTeam?.imagePath || drawnTeam?.imagePath) && (
                <Image
                  src={getImageUrl(drawnResult?.raffleTeam?.imagePath || drawnTeam?.imagePath)}
                  h={36}
                  w={36}
                  fit="contain"
                />
              )}
              <Box ta="left">
                <Text fw={800} size="md">
                  {drawnResult?.raffleTeam?.name || drawnTeam?.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {drawnResult?.raffleTeam?.abbreviation || drawnTeam?.abbreviation}
                </Text>
              </Box>
            </Group>
            <Divider my="sm" />
            <Group justify="center" gap="xl">
              <Box>
                <Text size="xs" c="dimmed">Grupo</Text>
                <Text fw={900} size="lg" c="orange.5">
                  {selectedGroup?.name}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Posición</Text>
                <Badge color="green" variant="light" size="lg">
                  #{drawnResult?.position}
                </Badge>
              </Box>
            </Group>
          </Paper>

          {/* Tabla del Grupo con Scroll Independiente */}
          <Box w="100%">
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Estado Actual — {selectedGroup?.name}
              </Text>
              <Text size="xs" c="dimmed">
                {groupResults.length}/{selectedGroup?.capacity ?? 0} ocupados
              </Text>
            </Group>
            <Paper
              withBorder
              radius="md"
              style={{ maxHeight: 180, overflowY: 'auto' }}
            >
              <Table striped withRowBorders={false} verticalSpacing={6}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>#</Table.Th>
                    <Table.Th>Equipo</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: selectedGroup?.capacity ?? 0 }).map((_, idx) => {
                    const pos = idx + 1;
                    const res = groupResults.find((r) => r.position === pos);
                    return (
                      <Table.Tr key={pos}>
                        <Table.Td>
                          <Text size="xs" c="dimmed" fw={700}>{pos}</Text>
                        </Table.Td>
                        <Table.Td>
                          {res ? (
                            <Group gap="xs" wrap="nowrap">
                              {res.raffleTeam?.imagePath && (
                                <Image
                                  src={getImageUrl(res.raffleTeam.imagePath)}
                                  h={20}
                                  w={20}
                                  fit="contain"
                                />
                              )}
                              <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                                {res.raffleTeam?.name} ({res.raffleTeam?.abbreviation})
                              </Text>
                            </Group>
                          ) : (
                            <Text size="sm" c="dimmed" fs="italic">— Vacío —</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          </Box>

          <Button
            size="lg"
            color="orange"
            fullWidth
            mt="xs"
            onClick={handleNextTeamDraw}
          >
            {remainingTeams.length === 0 ? 'Finalizar sorteo' : 'Sortear siguiente equipo'}
          </Button>
        </Stack>
      </Modal>

      {/* Modal Deshacer */}
      <Modal opened={undoOpened} onClose={closeUndo} title="Deshacer último sorteo" centered>
        <Stack>
          <Text size="sm">¿Estás seguro que querés deshacer el último sorteo realizado?</Text>
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