import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title, Text, Button, Group, Stack, Card, Badge, Box, 
  Stepper, Modal, TextInput, ActionIcon, Loader, Center,
  SimpleGrid, NumberInput, Tabs, Divider, MultiSelect, SegmentedControl, Paper, Avatar, Alert, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconTrash, IconEdit,
  IconExternalLink, IconArrowLeft, IconCheck, IconUsers,
  IconRun, IconCategory, IconDownload, IconShield, IconX, IconAlertTriangle, IconInfoCircle,
} from '@tabler/icons-react';
import { raffleApi } from '@/api/raffleApi';
import { raffleTeamApi } from '@/api/raffleTeamApi';
import { sportApi } from '@/api/sportApi';
import { globalTeamApi } from '@/api/globalTeamApi';
import { defaultCategoryApi } from '@/api/defaultCategoryApi';
import { notifications } from '@mantine/notifications';
import type {
  Raffle, RaffleTeam, Sport, SportCategory,
  SportCategoryGroup, GlobalTeam, DefaultCategory,
} from '@/types/api.types';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { getImageUrl } from '@/utils/imageUrl';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Sin configurar', color: 'gray' },
  configured: { label: 'Configurado', color: 'blue' },
  in_progress: { label: 'En proceso', color: 'orange' },
  finished: { label: 'Finalizado', color: 'green' },
};

interface SportWithData extends Sport {
  categories: SportCategory[];
  hasCategories: boolean;
}

const show429Notification = () => {
  notifications.show({
    title: 'Demasiadas peticiones',
    message: 'Por favor aguardá unos segundos antes de realizar otra acción.',
    color: 'red',
    icon: <IconAlertTriangle size={18} />,
  });
};

// ── Paso 1: Equipos ──────────────────────────────────────────────────────────
function TeamsStep({ raffleId, onDone }: { raffleId: string; onDone: () => void }) {
  const [teams, setTeams] = useState<RaffleTeam[]>([]);
  const [globalTeams, setGlobalTeams] = useState<GlobalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editTarget, setEditTarget] = useState<RaffleTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RaffleTeam | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteAllOpened, { open: openDeleteAll, close: closeDeleteAll }] = useDisclosure(false);
  const [selectedGlobal, setSelectedGlobal] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', abbreviation: '', imagePath: '' });
  const [errors, setErrors] = useState<{ name?: string; abbreviation?: string }>({});
  const [saving, setSaving] = useState(false);

  const addBtnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, g] = await Promise.all([
        raffleTeamApi.getByRaffle(raffleId),
        globalTeamApi.getAll(),
      ]);
      setTeams(t);
      setGlobalTeams(g);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
    } finally {
      setLoading(false);
    }
  }, [raffleId]);

  useEffect(() => { void load(); }, [load]);

  const availableGlobalTeams = globalTeams.filter(
    gt => !teams.some(t => t.name.toLowerCase() === gt.name.toLowerCase() || t.abbreviation.toLowerCase() === gt.abbreviation.toLowerCase())
  );

  const handleImport = async () => {
    if (!selectedGlobal.length) { closeImport(); return; }
    setSaving(true);
    try {
      await raffleTeamApi.importFromGlobal(raffleId, selectedGlobal);
      await load();
      closeImport();
      setSelectedGlobal([]);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al importar equipos', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    const newErrors: { name?: string; abbreviation?: string } = {};
    const trimName = form.name.trim().toLowerCase();
    const trimAbbr = form.abbreviation.trim().toLowerCase();

    if (!trimName) newErrors.name = 'El nombre es obligatorio';
    if (!trimAbbr) newErrors.abbreviation = 'La abreviación es obligatoria';

    if (trimName) {
      const nameExists = teams.some(
        t => t.id !== editTarget?.id && t.name.trim().toLowerCase() === trimName
      );
      if (nameExists) newErrors.name = 'Este nombre ya está registrado en este sorteo';
    }

    if (trimAbbr) {
      const abbrExists = teams.some(
        t => t.id !== editTarget?.id && t.abbreviation.trim().toLowerCase() === trimAbbr
      );
      if (abbrExists) newErrors.abbreviation = 'Esta abreviación ya está registrada en este sorteo';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      if (editTarget) {
        await raffleTeamApi.update(editTarget.id, form);
      } else {
        await raffleTeamApi.create(raffleId, form);
      }
      await load();
      closeAdd();
      setForm({ name: '', abbreviation: '', imagePath: '' });
      setEditTarget(null);
      setTimeout(() => addBtnRef.current?.focus(), 100);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al guardar el equipo', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await raffleTeamApi.delete(deleteTarget.id);
      await load();
      closeDelete();
      setDeleteTarget(null);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar el equipo', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteAll = async () => {
    setSaving(true);
    try {
      await Promise.all(teams.map(t => raffleTeamApi.delete(t.id)));
      await load();
      closeDeleteAll();
      notifications.show({ message: 'Todos los equipos fueron eliminados', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar equipos', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={500}>Equipos del sorteo ({teams.length})</Text>
        <Group gap="xs">
          {teams.length > 0 && (
            <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAll}>
              Borrar todos
            </Button>
          )}
          <Button size="xs" variant="light" color="orange" leftSection={<IconDownload size={14} />} onClick={openImport}>
            Importar del sistema ({availableGlobalTeams.length})
          </Button>
          <Button ref={addBtnRef} size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => { setEditTarget(null); setForm({ name: '', abbreviation: '', imagePath: '' }); setErrors({}); openAdd(); }}>
            Agregar equipo
          </Button>
        </Group>
      </Group>

      {teams.length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <Text c="dimmed" size="sm" mb="md">No hay equipos cargados todavía.</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {teams.map(team => (
            <Card key={team.id} withBorder radius="md" p="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <Avatar src={getImageUrl(team.imagePath)} radius="xl" size="sm" alt={team.name}>
                    <IconShield size={14} />
                  </Avatar>
                  <Box>
                    <Text fw={500} size="sm">{team.name}</Text>
                    <Text size="xs" c="dimmed">{team.abbreviation}</Text>
                  </Box>
                </Group>
                <Group gap={4}>
                  <ActionIcon size="sm" variant="subtle" color="orange" onClick={() => { setEditTarget(team); setForm({ name: team.name, abbreviation: team.abbreviation, imagePath: team.imagePath || '' }); setErrors({}); openAdd(); }}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon size="sm" variant="subtle" color="red" onClick={() => { setDeleteTarget(team); openDelete(); }}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Group justify="flex-end" mt="md">
        <Button color="orange" onClick={onDone} disabled={teams.length === 0}>
          Siguiente: Deportes →
        </Button>
      </Group>

      {/* Import Modal */}
      <Modal opened={importOpened} onClose={closeImport} title="Importar equipos del sistema" centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Hacé click en el campo para desplegar y seleccionar uno o varios equipos.
          </Text>
            <MultiSelect
              data-autofocus
              label="Equipos disponibles"
              placeholder={selectedGlobal.length > 0 ? '' : 'Seleccioná equipos...'}
              data={availableGlobalTeams.map(t => ({ value: t.id, label: `${t.name} (${t.abbreviation})` }))}
              value={selectedGlobal}
              onChange={setSelectedGlobal}
              searchable={false}
              hidePickedOptions
              maxDropdownHeight="50vh"
              comboboxProps={{ shadow: 'md', withinPortal: true }}
            />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeImport}>Cancelar</Button>
            <Button color="orange" loading={saving} disabled={selectedGlobal.length === 0} onClick={() => void handleImport()}>
              Importar seleccionados ({selectedGlobal.length})
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal opened={addOpened} onClose={() => { closeAdd(); setTimeout(() => addBtnRef.current?.focus(), 100); }} title={editTarget ? 'Editar equipo' : 'Agregar equipo'} centered>
        <Stack>
          <TextInput
            data-autofocus
            label="Nombre completo"
            placeholder="Ej: Facultad Regional Villa María"
            value={form.name}
            error={errors.name}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, name: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, name: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
          />
          <TextInput
            label="Abreviación"
            placeholder="Ej: FRVM"
            value={form.abbreviation}
            error={errors.abbreviation}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, abbreviation: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, abbreviation: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
          />
          <ImageUploadInput
            label="Logo / Escudo del equipo (opcional)"
            value={form.imagePath}
            onChange={path => setForm(f => ({ ...f, imagePath: path || '' }))}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeAdd(); setTimeout(() => addBtnRef.current?.focus(), 100); }}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSave()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Eliminar equipo" centered>
        <Stack>
          <Text>¿Eliminar el equipo <strong>{deleteTarget?.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDelete()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete All Modal */}
      <Modal opened={deleteAllOpened} onClose={closeDeleteAll} title="Eliminar todos los equipos" centered>
        <Stack>
          <Text>¿Estás seguro de que querés eliminar <strong>todos los equipos</strong> de este sorteo? Esta acción no se puede deshacer.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAll}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAll()}>Eliminar todos</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Paso 2: Deportes ──────────────────────────────────────────────────────────
function SportsStep({ raffleId, onDone, onBack }: { raffleId: string; onDone: () => void; onBack: () => void }) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editTarget, setEditTarget] = useState<Sport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sport | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteAllOpened, { open: openDeleteAll, close: closeDeleteAll }] = useDisclosure(false);
  const [form, setForm] = useState({ name: '', abbreviation: '' });
  const [errors, setErrors] = useState<{ name?: string; abbreviation?: string }>({});
  const [saving, setSaving] = useState(false);

  const addBtnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sportApi.getByRaffle(raffleId);
      setSports(data);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
    } finally {
      setLoading(false);
    }
  }, [raffleId]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    const newErrors: { name?: string; abbreviation?: string } = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!form.abbreviation.trim()) newErrors.abbreviation = 'La abreviación es obligatoria';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      if (editTarget) await sportApi.updateSport(editTarget.id, form);
      else await sportApi.createSport(raffleId, { ...form, order: sports.length });
      await load();
      closeAdd();
      setForm({ name: '', abbreviation: '' });
      setEditTarget(null);
      setTimeout(() => addBtnRef.current?.focus(), 100);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al guardar el deporte', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sportApi.deleteSport(deleteTarget.id);
      await load();
      closeDelete();
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar el deporte', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteAll = async () => {
    setSaving(true);
    try {
      await Promise.all(sports.map(s => sportApi.deleteSport(s.id)));
      await load();
      closeDeleteAll();
      notifications.show({ message: 'Todos los deportes fueron eliminados', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar deportes', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={500}>Deportes del sorteo ({sports.length})</Text>
        <Group gap="xs">
          {sports.length > 0 && (
            <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAll}>
              Borrar todos
            </Button>
          )}
          <Button ref={addBtnRef} size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => { setEditTarget(null); setForm({ name: '', abbreviation: '' }); setErrors({}); openAdd(); }}>
            Agregar deporte
          </Button>
        </Group>
      </Group>

      {sports.length === 0 ? (
        <Card withBorder radius="md" p="lg" ta="center">
          <Text c="dimmed" size="sm">No hay deportes cargados todavía.</Text>
        </Card>
      ) : (
        <Stack gap="xs">
          {sports.map(sport => (
            <Card key={sport.id} withBorder radius="md" p="sm">
              <Group justify="space-between">
                <Box>
                  <Text fw={500} size="sm">{sport.name}</Text>
                  <Text size="xs" c="dimmed">{sport.abbreviation}</Text>
                </Box>
                <Group gap={4}>
                  <ActionIcon size="sm" variant="subtle" color="orange" onClick={() => { setEditTarget(sport); setForm({ name: sport.name, abbreviation: sport.abbreviation }); setErrors({}); openAdd(); }}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon size="sm" variant="subtle" color="red" onClick={() => { setDeleteTarget(sport); openDelete(); }}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={onBack}>← Volver</Button>
        <Button color="orange" onClick={onDone} disabled={sports.length === 0}>
          Siguiente: Grupos →
        </Button>
      </Group>

      <Modal opened={addOpened} onClose={() => { closeAdd(); setTimeout(() => addBtnRef.current?.focus(), 100); }} title={editTarget ? 'Editar deporte' : 'Agregar deporte'} centered>
        <Stack>
          <TextInput
            data-autofocus
            label="Nombre completo"
            placeholder="Ej: Fútbol"
            value={form.name}
            error={errors.name}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, name: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, name: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
          />
          <TextInput
            label="Abreviación"
            placeholder="Ej: FUT"
            value={form.abbreviation}
            error={errors.abbreviation}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, abbreviation: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, abbreviation: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeAdd(); setTimeout(() => addBtnRef.current?.focus(), 100); }}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSave()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDelete} title="Eliminar deporte" centered>
        <Stack>
          <Text>¿Eliminar el deporte <strong>{deleteTarget?.name}</strong>? Se eliminarán también sus categorías y grupos.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDelete()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteAllOpened} onClose={closeDeleteAll} title="Eliminar todos los deportes" centered>
        <Stack>
          <Text>¿Estás seguro de que querés eliminar <strong>todos los deportes</strong> de este sorteo? Se eliminarán todas sus categorías y grupos asociados.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAll}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAll()}>Eliminar todos</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Paso 3: Grupos y Categorías ───────────────────────────────────────────────
function GroupsStep({ raffleId, onDone, onBack }: { raffleId: string; onDone: () => void; onBack: () => void }) {
  const [sports, setSports] = useState<SportWithData[]>([]);
  const [defaultCategories, setDefaultCategories] = useState<DefaultCategory[]>([]);
  const [totalTeamsCount, setTotalTeamsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const [sportCategoryMap, setSportCategoryMap] = useState<Record<string, string>>({});

  const [groups, setGroups] = useState<SportCategoryGroup[]>([]);
  
  // Modales
  const [catModalOpened, { open: openCatModal, close: closeCatModal }] = useDisclosure(false);
  const [renameCatTarget, setRenameCatTarget] = useState<SportCategory | null>(null);
  const [renameCatName, setRenameCatName] = useState('');
  const [renameCatError, setRenameCatError] = useState<string | undefined>(undefined);
  const [renameCatOpened, { open: openRenameCat, close: closeRenameCat }] = useDisclosure(false);

  const [deleteCatTarget, setDeleteCatTarget] = useState<SportCategory | null>(null);
  const [deleteCatOpened, { open: openDeleteCat, close: closeDeleteCat }] = useDisclosure(false);
  const [deleteAllCatsOpened, { open: openDeleteAllCats, close: closeDeleteAllCats }] = useDisclosure(false);

  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [deleteAllGroupsOpened, { open: openDeleteAllGroups, close: closeDeleteAllGroups }] = useDisclosure(false);

  // Focus Refs
  const sportsTabsListRef = useRef<HTMLDivElement>(null);
  const catsTabsListRef = useRef<HTMLDivElement>(null);
  const addCatBtnRef = useRef<HTMLButtonElement>(null);

  // Category modal states
  const [catSourceType, setCatSourceType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPredefinedCats, setSelectedPredefinedCats] = useState<string[]>([]);
  const [customCatName, setCustomCatName] = useState('');
  const [catError, setCatError] = useState<string | undefined>(undefined);

  // Group modal states
  const [groupCount, setGroupCount] = useState<number>(4);
  const [capacityMode, setCapacityMode] = useState<'same' | 'custom'>('same');
  const [groupCapacity, setGroupCapacity] = useState<number>(4);
  const [groupCapacities, setGroupCapacities] = useState<number[]>([4, 4, 4, 4]);

  const [nameMode, setNameMode] = useState<'default' | 'custom'>('default');
  const [groupNames, setGroupNames] = useState<string[]>(['', '', '', '']);
  const [saving, setSaving] = useState(false);

  const currentSport = sports.find(s => s.id === activeSport);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [sportsRaw, defCats, raffleTeams] = await Promise.all([
        sportApi.getByRaffle(raffleId),
        defaultCategoryApi.getAll(),
        raffleTeamApi.getByRaffle(raffleId),
      ]);
      setDefaultCategories(defCats);
      setTotalTeamsCount(raffleTeams.length);

      const sportsWithData = await Promise.all(
        sportsRaw.map(async s => {
          const cats = await sportApi.getCategories(s.id);
          return { ...s, categories: cats, hasCategories: cats.length > 0 };
        })
      );

      setSports(sportsWithData);

      setActiveSport(prev => {
        if (prev && sportsWithData.some(s => s.id === prev)) return prev;
        return sportsWithData[0]?.id ?? null;
      });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
    } finally {
      setLoading(false);
    }
  }, [raffleId]);

  useEffect(() => { void loadInitialData(); }, [loadInitialData]);

  const getActiveCategoryForSport = useCallback((sportId: string | null, sportsList: SportWithData[]) => {
    if (!sportId) return null;
    const sport = sportsList.find(s => s.id === sportId);
    if (!sport || !sport.hasCategories || sport.categories.length === 0) return null;

    const savedCatId = sportCategoryMap[sportId];
    if (savedCatId && sport.categories.some(c => c.id === savedCatId)) {
      return savedCatId;
    }
    return sport.categories[0].id;
  }, [sportCategoryMap]);

  const activeCategoryVal = getActiveCategoryForSport(activeSport, sports);

  useEffect(() => {
    if (!activeSport) return;
    const catId = currentSport?.hasCategories ? activeCategoryVal : null;
    
    sportApi.getGroups(activeSport, catId)
      .then(setGroups)
      .catch((err) => {
        if (err?.response?.status === 429) show429Notification();
      });
  }, [activeSport, activeCategoryVal, currentSport, sports]);

  const handleSportTabChange = (sportId: string | null) => {
    if (!sportId) return;
    setActiveSport(sportId);

    if (sportsTabsListRef.current) {
      const activeTab = sportsTabsListRef.current.querySelector(`[data-value="${sportId}"]`) as HTMLElement;
      activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleCatTabChange = (catId: string | null) => {
    if (!catId || !activeSport) return;
    setSportCategoryMap(prev => ({ ...prev, [activeSport]: catId }));

    if (catsTabsListRef.current) {
      const activeTab = catsTabsListRef.current.querySelector(`[data-value="${catId}"]`) as HTMLElement;
      activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const availableDefCats = defaultCategories.filter(
    dc => !currentSport?.categories.some(c => c.name.toLowerCase() === dc.name.toLowerCase())
  );

  const handleAddCategory = async () => {
    if (!activeSport || !currentSport) return;
    const existingNames = currentSport.categories.map(c => c.name.trim().toLowerCase());

    if (catSourceType === 'predefined') {
      if (selectedPredefinedCats.length === 0) {
        setCatError('Seleccioná al menos una categoría');
        return;
      }

      const hasDuplicate = selectedPredefinedCats.some(name =>
        existingNames.includes(name.trim().toLowerCase())
      );

      if (hasDuplicate) {
        setCatError('Una o más de las categorías seleccionadas ya existen en este deporte');
        return;
      }

      setCatError(undefined);
      setSaving(true);
      try {
        const created = await Promise.all(selectedPredefinedCats.map(name => sportApi.createCategory(activeSport, { name })));
        await loadInitialData();
        if (created.length > 0 && created[created.length - 1]?.id) {
          const lastCreatedId = created[created.length - 1].id;
          setSportCategoryMap(prev => ({ ...prev, [activeSport]: lastCreatedId }));
        }
        closeCatModal();
        setSelectedPredefinedCats([]);
        setTimeout(() => addCatBtnRef.current?.focus(), 100);
      } catch (err: any) {
        if (err?.response?.status === 429) show429Notification();
        else notifications.show({ message: 'Error al agregar categorías', color: 'red' });
      } finally { setSaving(false); }
    } else {
      const trimmedName = customCatName.trim();

      if (!trimmedName) {
        setCatError('Ingresá el nombre de la categoría');
        return;
      }

      if (existingNames.includes(trimmedName.toLowerCase())) {
        setCatError('Esta categoría ya está registrada en este deporte');
        return;
      }

      setCatError(undefined);
      setSaving(true);
      try {
        const created = await sportApi.createCategory(activeSport, { name: trimmedName });
        await loadInitialData();
        if (created?.id) {
          setSportCategoryMap(prev => ({ ...prev, [activeSport]: created.id }));
        }
        closeCatModal();
        setCustomCatName('');
        setTimeout(() => addCatBtnRef.current?.focus(), 100);
      } catch (err: any) {
        if (err?.response?.status === 429) show429Notification();
        else notifications.show({ message: 'Error al agregar categoría', color: 'red' });
      } finally { setSaving(false); }
    }
  };

  const handleRenameCategory = async () => {
    if (!renameCatTarget || !renameCatName.trim() || !currentSport) return;
    const trimmed = renameCatName.trim();
    const existing = currentSport.categories.some(
      c => c.id !== renameCatTarget.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setRenameCatError('Ya existe una categoría con ese nombre en este deporte');
      return;
    }

    setRenameCatError(undefined);
    setSaving(true);
    try {
      await sportApi.updateCategory(renameCatTarget.id, { name: trimmed });
      await loadInitialData();
      closeRenameCat();
      setRenameCatTarget(null);
      setRenameCatName('');
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al renombrar categoría', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget || !activeSport) return;
    setSaving(true);
    try {
      await sportApi.deleteCategory(deleteCatTarget.id);
      
      setSportCategoryMap(prev => {
        const next = { ...prev };
        if (next[activeSport] === deleteCatTarget.id) delete next[activeSport];
        return next;
      });

      await loadInitialData();
      closeDeleteCat();
      setDeleteCatTarget(null);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar categoría', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteAllCategories = async () => {
    if (!currentSport || !activeSport) return;
    setSaving(true);
    try {
      await Promise.all(currentSport.categories.map(c => sportApi.deleteCategory(c.id)));
      
      setSportCategoryMap(prev => {
        const next = { ...prev };
        delete next[activeSport];
        return next;
      });

      await loadInitialData();
      closeDeleteAllCats();
      notifications.show({ message: 'Todas las categorías del deporte fueron eliminadas', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar categorías', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleGroupCountChange = (v: number | string) => {
    const newCount = Number(v) || 1;
    setGroupCount(newCount);

    setGroupCapacities(prev => {
      const next = [...prev];
      if (newCount > next.length) {
        for (let i = next.length; i < newCount; i++) next.push(groupCapacity || 4);
      } else {
        next.length = newCount;
      }
      return next;
    });

    setGroupNames(prev => {
      const next = [...prev];
      if (newCount > next.length) {
        for (let i = next.length; i < newCount; i++) next.push('');
      } else {
        next.length = newCount;
      }
      return next;
    });
  };

  const handleCreateGroups = async () => {
    if (!activeSport) return;
    setSaving(true);
    const catId = currentSport?.hasCategories ? activeCategoryVal : null;
    try {
      const groupPayload = Array.from({ length: groupCount }).map((_, i) => {
        const defaultName = `Grupo ${String.fromCharCode(65 + i)}`;
        const customName = groupNames[i]?.trim();
        const finalName = nameMode === 'default' ? defaultName : (customName || defaultName);
        const finalCap = capacityMode === 'same' ? groupCapacity : (groupCapacities[i] || 4);

        return {
          name: finalName,
          capacity: finalCap,
        };
      });

      await sportApi.createGroups(activeSport, groupPayload, catId);

      const updated = await sportApi.getGroups(activeSport, catId);
      setGroups(updated);
      closeGroupModal();
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: err?.response?.data?.message?.[0] || 'Error al crear grupos', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteAllGroups = async () => {
    setSaving(true);
    try {
      await Promise.all(groups.map(g => sportApi.deleteGroup(g.id)));
      const catId = currentSport?.hasCategories ? activeCategoryVal : null;
      if (activeSport) setGroups(await sportApi.getGroups(activeSport, catId));
      closeDeleteAllGroups();
      notifications.show({ message: 'Todos los grupos fueron eliminados', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar grupos', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  const maxGroupsAllowed = totalTeamsCount > 0 ? totalTeamsCount : 20;
  const calculatedTotalCapacity = capacityMode === 'same'
    ? groupCount * groupCapacity
    : groupCapacities.reduce((a, b) => a + b, 0);

  const capacityExceeds = totalTeamsCount > 0 && calculatedTotalCapacity > totalTeamsCount;

  return (
    <Stack gap="md">
      {/* ── 1. Solapas de Deportes ── */}
      <Box>
        <Tabs value={activeSport} onChange={handleSportTabChange} variant="pills" radius="md">
          <Tabs.List
            ref={sportsTabsListRef}
            style={{
              flexWrap: 'nowrap',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {sports.map(s => (
              <Tabs.Tab
                key={s.id}
                value={s.id}
                data-value={s.id}
                style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
              >
                {s.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      </Box>

      {/* ── 2. Cabecera limpia de Categorías ── */}
      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Text fw={600} size="sm">Categorías de {currentSport?.name}:</Text>
              {currentSport?.categories.length === 0 && (
                <Text size="sm" c="dimmed">(General - Sin categorías)</Text>
              )}
            </Group>
            <Group gap="xs">
              {currentSport && currentSport.categories.length > 0 && (
                <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAllCats}>
                  Borrar categorías
                </Button>
              )}
              <Button ref={addCatBtnRef} size="xs" color="orange" variant="light" leftSection={<IconPlus size={14} />} onClick={() => { setCatError(undefined); setSelectedPredefinedCats([]); setCustomCatName(''); openCatModal(); }}>
                Agregar categoría
              </Button>
            </Group>
          </Group>

          {currentSport && currentSport.categories.length > 0 && (
            <Tabs
              value={activeCategoryVal}
              onChange={handleCatTabChange}
              variant="outline"
              radius="sm"
            >
              <Tabs.List
                ref={catsTabsListRef}
                style={{
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {currentSport.categories.map(c => (
                  <Tabs.Tab
                    key={c.id}
                    value={c.id}
                    data-value={c.id}
                    style={{ whiteSpace: 'nowrap' }}
                    onDoubleClick={() => {
                      setRenameCatTarget(c);
                      setRenameCatName(c.name);
                      setRenameCatError(undefined);
                      openRenameCat();
                    }}
                  >
                    <Tooltip label="Doble click para renombrar" openDelay={500}>
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm">{c.name}</Text>
                        <Box
                          component="span"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            opacity: 0.7,
                            padding: '2px',
                            borderRadius: '4px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCatTarget(c);
                            openDeleteCat();
                          }}
                        >
                          <IconX size={12} />
                        </Box>
                      </Group>
                    </Tooltip>
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          )}
        </Stack>
      </Paper>

      {/* ── 3. Sección de Grupos limpia ── */}
      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Box>
              <Text fw={600} size="md">Grupos configurados ({groups.length})</Text>
              <Text size="xs" c="dimmed">
                {currentSport?.name} {currentSport?.hasCategories ? `• ${currentSport.categories.find(c => c.id === activeCategoryVal)?.name ?? ''}` : ''}
              </Text>
            </Box>
            <Group gap="xs">
              {groups.length > 0 && (
                <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAllGroups}>
                  Borrar todos
                </Button>
              )}
              <Button size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => {
                const initCount = Math.min(4, maxGroupsAllowed);
                setGroupCount(initCount);
                setGroupCapacity(4);
                setGroupCapacities(Array(initCount).fill(4));
                setCapacityMode('same');
                setNameMode('default');
                setGroupNames(Array(initCount).fill(''));
                openGroupModal();
              }}>
                Crear grupos
              </Button>
            </Group>
          </Group>

          <Divider />

          {groups.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="lg">No hay grupos configurados todavía.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {groups.map(g => (
                <Card key={g.id} withBorder radius="md" p="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={500} size="sm">{g.name}</Text>
                      <Text size="xs" c="dimmed">{g.capacity} equipos por grupo</Text>
                    </Box>
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={async () => {
                      try {
                        await sportApi.deleteGroup(g.id);
                        const catId = currentSport?.hasCategories ? activeCategoryVal : null;
                        if (activeSport) setGroups(await sportApi.getGroups(activeSport, catId));
                      } catch (err: any) {
                        if (err?.response?.status === 429) show429Notification();
                      }
                    }}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Paper>

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={onBack}>← Volver</Button>
        <Button color="orange" leftSection={<IconCheck size={16} />} onClick={onDone}>
          Finalizar configuración
        </Button>
      </Group>

      {/* Modal Agregar Categorías */}
      <Modal opened={catModalOpened} onClose={() => { closeCatModal(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }} title="Agregar categoría" centered>
        <Stack gap="md">
          <SegmentedControl
            value={catSourceType}
            onChange={v => { setCatSourceType(v as 'predefined' | 'custom'); setCatError(undefined); }}
            data={[
              { label: 'Usar Predefinidas', value: 'predefined' },
              { label: 'Crear Nueva', value: 'custom' },
            ]}
          />

          {catSourceType === 'predefined' ? (
            <MultiSelect
              data-autofocus
              label="Seleccionar categorías del sistema"
              placeholder="Seleccioná categorías..."
              data={availableDefCats.map(c => ({ value: c.name, label: c.name }))}
              value={selectedPredefinedCats}
              onChange={v => { setSelectedPredefinedCats(v); setCatError(undefined); }}
              error={catError}
              searchable={false}
              hidePickedOptions
              maxDropdownHeight="50vh"
              comboboxProps={{ shadow: 'md', withinPortal: true }}
            />
          ) : (
            <TextInput
              data-autofocus
              label="Nombre de la nueva categoría"
              placeholder="Ej: Masculino, Femenino, Sub-20"
              value={customCatName}
              error={catError}
              onChange={e => {
                const val = e.target.value;
                setCustomCatName(val);
                if (val.trim()) setCatError(undefined);
              }}
              onKeyDown={e => e.key === 'Enter' && void handleAddCategory()}
            />
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeCatModal(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleAddCategory()}>Agregar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Renombrar Categoría */}
      <Modal opened={renameCatOpened} onClose={closeRenameCat} title="Renombrar categoría" centered>
        <Stack>
          <TextInput
            data-autofocus
            label="Nombre de la categoría"
            value={renameCatName}
            error={renameCatError}
            onChange={e => {
              setRenameCatName(e.target.value);
              if (e.target.value.trim()) setRenameCatError(undefined);
            }}
            onKeyDown={e => e.key === 'Enter' && void handleRenameCategory()}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeRenameCat}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleRenameCategory()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Eliminar Categoría Individual */}
      <Modal opened={deleteCatOpened} onClose={closeDeleteCat} title="Eliminar categoría" centered>
        <Stack>
          <Text>¿Eliminar la categoría <strong>{deleteCatTarget?.name}</strong> de {currentSport?.name}? Se eliminarán los grupos asociados a esta categoría.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteCat}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteCategory()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Eliminar Todas las Categorías */}
      <Modal opened={deleteAllCatsOpened} onClose={closeDeleteAllCats} title="Eliminar todas las categorías" centered>
        <Stack>
          <Text>¿Estás seguro de eliminar <strong>todas las categorías</strong> de {currentSport?.name}? Se eliminarán todos sus grupos asociados.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAllCats}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAllCategories()}>Eliminar todas</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Creación de Grupos */}
      <Modal opened={groupModalOpened} onClose={closeGroupModal} title="Configurar y Crear Grupos" size="lg" centered>
        <Stack gap="md">
          {totalTeamsCount > 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" radius="md">
              <Text size="xs">
                Este sorteo cuenta con <strong>{totalTeamsCount} equipos</strong> cargados. Los límites se calcularon según la cantidad disponible.
              </Text>
            </Alert>
          ) : (
            <Alert icon={<IconAlertTriangle size={16} />} color="orange" radius="md">
              <Text size="xs">
                No hay equipos cargados en este sorteo. Podés configurar los grupos de todas formas.
              </Text>
            </Alert>
          )}

          {/* Sub-sección 1: Cantidad de grupos */}
          <Paper withBorder p="sm" radius="md">
            <Stack gap="xs">
              <Text fw={600} size="sm">1. Cantidad de grupos</Text>
              <NumberInput
                data-autofocus
                placeholder="Ej: 4"
                value={groupCount}
                min={1}
                max={maxGroupsAllowed}
                onChange={handleGroupCountChange}
                description={totalTeamsCount > 0 ? `Máximo ${maxGroupsAllowed} grupos (según equipos del sorteo)` : undefined}
              />
            </Stack>
          </Paper>

          {/* Sub-sección 2: Equipos por grupo */}
          <Paper withBorder p="sm" radius="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600} size="sm">2. Capacidad de equipos por grupo</Text>
                <SegmentedControl
                  size="xs"
                  value={capacityMode}
                  onChange={v => setCapacityMode(v as 'same' | 'custom')}
                  data={[
                    { label: 'Misma capacidad', value: 'same' },
                    { label: 'Diferente por grupo', value: 'custom' },
                  ]}
                />
              </Group>

              {capacityMode === 'same' ? (
                <NumberInput
                  label="Equipos por grupo"
                  value={groupCapacity}
                  min={1}
                  max={totalTeamsCount > 0 ? totalTeamsCount : 50}
                  onChange={v => setGroupCapacity(Number(v) || 1)}
                />
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {Array.from({ length: groupCount }).map((_, i) => (
                    <NumberInput
                      key={i}
                      label={`Capacidad ${nameMode === 'default' ? `Grupo ${String.fromCharCode(65 + i)}` : (groupNames[i] || `Grupo ${i + 1}`)}`}
                      value={groupCapacities[i] ?? groupCapacity}
                      min={1}
                      max={totalTeamsCount > 0 ? totalTeamsCount : 50}
                      onChange={v => {
                        const val = Number(v) || 1;
                        setGroupCapacities(prev => { const n = [...prev]; n[i] = val; return n; });
                      }}
                    />
                  ))}
                </SimpleGrid>
              )}

              <Box style={{ minHeight: 18 }}>
                <Text
                  size="xs"
                  c="red"
                  fw={500}
                  style={{
                    visibility: capacityExceeds ? 'visible' : 'hidden',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Atención: La suma total de capacidad ({calculatedTotalCapacity} cupos) supera la cantidad de equipos del sorteo ({totalTeamsCount}).
                </Text>
              </Box>
            </Stack>
          </Paper>

          {/* Sub-sección 3: Nombres de los grupos */}
          <Paper withBorder p="sm" radius="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600} size="sm">3. Nombres de los grupos</Text>
                <SegmentedControl
                  size="xs"
                  value={nameMode}
                  onChange={v => setNameMode(v as 'default' | 'custom')}
                  data={[
                    { label: 'Automático', value: 'default' },
                    { label: 'Personalizado', value: 'custom' },
                  ]}
                />
              </Group>

              {nameMode === 'default' ? (
                <Text size="xs" c="dimmed">
                  Los grupos se nombrarán automáticamente: {Array.from({ length: groupCount }).map((_, i) => `Grupo ${String.fromCharCode(65 + i)}`).join(', ')}.
                </Text>
              ) : (
                <Stack gap="xs" mt="xs">
                  {Array.from({ length: groupCount }).map((_, i) => (
                    <TextInput
                      key={i}
                      label={`Nombre del grupo ${i + 1}`}
                      placeholder={`Ej: Grupo ${String.fromCharCode(65 + i)}`}
                      value={groupNames[i] ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setGroupNames(prev => { const n = [...prev]; n[i] = val; return n; });
                      }}
                      onKeyDown={e => e.key === 'Enter' && void handleCreateGroups()}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={closeGroupModal}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleCreateGroups()}>
              Crear {groupCount} {groupCount === 1 ? 'grupo' : 'grupos'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Eliminar Todos los Grupos */}
      <Modal opened={deleteAllGroupsOpened} onClose={closeDeleteAllGroups} title="Eliminar todos los grupos" centered>
        <Stack>
          <Text>¿Estás seguro de eliminar <strong>todos los grupos</strong> de esta sección?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAllGroups}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAllGroups()}>Eliminar todos</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function RaffleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!id) return;
    raffleApi.getById(id).then(async (r) => {
      if (r.status === 'configured') {
        const resetRaffle = await raffleApi.update(r.id, { status: 'pending' });
        setRaffle(resetRaffle);
      } else {
        setRaffle(r);
      }
    }).catch(err => {
      if (err?.response?.status === 429) show429Notification();
    }).finally(() => setLoading(false));
  }, [id]);

  const handleFinishConfig = async () => {
    if (!raffle) return;
    try {
      await raffleApi.update(raffle.id, { status: 'configured' });
      notifications.show({ message: 'Configuración de sorteo finalizada con éxito', color: 'green' });
      navigate('/raffles');
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al finalizar la configuración', color: 'red' });
    }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;
  if (!raffle) return <Text>Sorteo no encontrado.</Text>;

  return (
    <Box p="md">
      <Group mb="xl">
        <ActionIcon variant="subtle" onClick={() => navigate('/raffles')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Box style={{ flex: 1 }}>
          <Group gap="sm">
            <Title order={3}>{raffle.name}</Title>
            <Badge color={STATUS_LABELS[raffle.status]?.color} variant="light">
              {STATUS_LABELS[raffle.status]?.label}
            </Badge>
          </Group>
        </Box>
        <Group gap="xs">
          {raffle.publicSlug && (
            <Button size="sm" variant="light" color="blue" leftSection={<IconExternalLink size={14} />}
              onClick={() => window.open(`/s/${raffle.publicSlug}`, '_blank')}>
              Ver público
            </Button>
          )}
        </Group>
      </Group>

      {/* Wizard de Configuración de Sorteo */}
      <Card withBorder radius="md" p="xl">
        <Stepper active={activeStep} color="orange" mb="xl">
          <Stepper.Step label="Equipos" icon={<IconUsers size={16} />} description="que participan" />
          <Stepper.Step label="Deportes" icon={<IconRun size={16} />} description="en los que compiten" />
          <Stepper.Step label="Grupos" icon={<IconCategory size={16} />} description="y categorías" />
        </Stepper>

        {activeStep === 0 && (
          <TeamsStep raffleId={raffle.id} onDone={() => setActiveStep(1)} />
        )}
        {activeStep === 1 && (
          <SportsStep raffleId={raffle.id} onDone={() => setActiveStep(2)} onBack={() => setActiveStep(0)} />
        )}
        {activeStep === 2 && (
          <GroupsStep raffleId={raffle.id} onDone={() => void handleFinishConfig()} onBack={() => setActiveStep(1)} />
        )}
      </Card>
    </Box>
  );
}