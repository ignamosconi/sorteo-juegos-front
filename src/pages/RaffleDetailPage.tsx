import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title, Text, Button, Group, Stack, Card, Badge, Box, Alert, 
  Stepper, Modal, TextInput, ActionIcon, Loader, Center,
  SimpleGrid, NumberInput, Tabs, Divider, Select, MultiSelect, SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconTrash, IconEdit, IconPlayerPlay,
  IconExternalLink, IconArrowLeft, IconCheck, IconUsers,
  IconRun, IconCategory, IconDownload, IconShield,
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
import { Avatar } from '@mantine/core';


const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Sin iniciar', color: 'gray' },
  in_progress: { label: 'En proceso', color: 'orange' },
  finished: { label: 'Finalizado', color: 'green' },
};

interface SportWithData extends Sport {
  categories: SportCategory[];
  hasCategories: boolean;
}

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
  const [selectedGlobal, setSelectedGlobal] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', abbreviation: '', imagePath: '' });
  const [errors, setErrors] = useState<{ name?: string; abbreviation?: string }>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, g] = await Promise.all([
      raffleTeamApi.getByRaffle(raffleId),
      globalTeamApi.getAll(),
    ]);
    setTeams(t);
    setGlobalTeams(g);
    setLoading(false);
  }, [raffleId]);

  useEffect(() => { void load(); }, [load]);

  const handleImport = async () => {
    if (!selectedGlobal.length) { closeImport(); return; }
    setSaving(true);
    try {
      await raffleTeamApi.importFromGlobal(raffleId, selectedGlobal);
      await load();
      closeImport();
      setSelectedGlobal([]);
    } catch {
      notifications.show({ message: 'Error al importar equipos', color: 'red' });
    } finally { setSaving(false); }
  };

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
      if (editTarget) {
        await raffleTeamApi.update(editTarget.id, form);
      } else {
        await raffleTeamApi.create(raffleId, form);
      }
      await load();
      closeAdd();
      setForm({ name: '', abbreviation: '', imagePath: '' });
      setEditTarget(null);
    } catch {
      notifications.show({ message: 'Error al guardar el equipo', color: 'red' });
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
    } catch {
      notifications.show({ message: 'Error al eliminar el equipo', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>Equipos del sorteo ({teams.length})</Text>
        <Group gap="xs">
          <Button size="xs" variant="light" color="orange" leftSection={<IconDownload size={14} />} onClick={openImport}>
            Importar del sistema ({globalTeams.length})
          </Button>
          <Button size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => { setEditTarget(null); setForm({ name: '', abbreviation: '', imagePath: '' }); setErrors({}); openAdd(); }}>
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

      {/* Import modal */}
      <Modal opened={importOpened} onClose={closeImport} title="Importar equipos del sistema" centered>
        <Stack>
          <Text size="sm">
            El sistema tiene equipos precargados disponibles. Seleccioná los que querés importar a este sorteo.
          </Text>
          <MultiSelect
            label="Equipos a importar"
            placeholder="Seleccioná equipos..."
            data={globalTeams.map(t => ({ value: t.id, label: `${t.name} (${t.abbreviation})` }))}
            value={selectedGlobal}
            onChange={setSelectedGlobal}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeImport}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleImport()}>
              Importar seleccionados
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add/Edit modal */}
      <Modal opened={addOpened} onClose={closeAdd} title={editTarget ? 'Editar equipo' : 'Agregar equipo'} centered>
        <Stack>
          <TextInput
            label="Nombre completo"
            placeholder="Ej: Facultad Regional Villa María"
            value={form.name}
            error={errors.name}
            onChange={e => {
              const val = e.currentTarget.value;
              setForm(f => ({ ...f, name: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, name: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
            autoFocus
          />
          <TextInput
            label="Abreviación"
            placeholder="Ej: FRVM"
            value={form.abbreviation}
            error={errors.abbreviation}
            onChange={e => {
              const val = e.currentTarget.value;
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
            <Button variant="subtle" onClick={closeAdd}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSave()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Eliminar equipo" centered>
        <Stack>
          <Text>¿Eliminar el equipo <strong>{deleteTarget?.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDelete()}>Eliminar</Button>
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
  const [form, setForm] = useState({ name: '', abbreviation: '' });
  const [errors, setErrors] = useState<{ name?: string; abbreviation?: string }>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await sportApi.getByRaffle(raffleId);
    setSports(data);
    setLoading(false);
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
    } catch {
      notifications.show({ message: 'Error al guardar el deporte', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sportApi.deleteSport(deleteTarget.id);
      await load();
      closeDelete();
    } catch {
      notifications.show({ message: 'Error al eliminar el deporte', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>Deportes del sorteo ({sports.length})</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => { setEditTarget(null); setForm({ name: '', abbreviation: '' }); setErrors({}); openAdd(); }}>
          Agregar deporte
        </Button>
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

      <Modal opened={addOpened} onClose={closeAdd} title={editTarget ? 'Editar deporte' : 'Agregar deporte'} centered>

        <Alert
          icon={<IconShield size={16} />}
          color="orange"
          mb="md"
          radius="md"
        >
          <Text size="sm">
            Las categorías (masculino, femenino) se cargan después. Escribí solo el NOMBRE del deporte.
          </Text>
        </Alert>

        <Stack>
          <TextInput
            label="Nombre completo"
            placeholder="Ej: Fútbol"
            value={form.name}
            error={errors.name}
            onChange={e => {
              const val = e.currentTarget.value;
              setForm(f => ({ ...f, name: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, name: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
            autoFocus
          />
          <TextInput
            label="Abreviación"
            placeholder="Ej: FUT"
            value={form.abbreviation}
            error={errors.abbreviation}
            onChange={e => {
              const val = e.currentTarget.value;
              setForm(f => ({ ...f, abbreviation: val }));
              if (val.trim()) setErrors(prev => ({ ...prev, abbreviation: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSave()}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeAdd}>Cancelar</Button>
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
    </Stack>
  );
}

// ── Paso 3: Grupos ────────────────────────────────────────────────────────────
function GroupsStep({ raffleId, onDone, onBack }: { raffleId: string; onDone: () => void; onBack: () => void }) {
  const [sports, setSports] = useState<SportWithData[]>([]);
  const [defaultCategories, setDefaultCategories] = useState<DefaultCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [groups, setGroups] = useState<SportCategoryGroup[]>([]);
  const [catModalOpened, { open: openCatModal, close: closeCatModal }] = useDisclosure(false);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);

  // Category modal states
  const [catSourceType, setCatSourceType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPredefinedCat, setSelectedPredefinedCat] = useState<string | null>(null);
  const [customCatName, setCustomCatName] = useState('');
  const [catError, setCatError] = useState<string | undefined>(undefined);

  // Group modal states
  const [groupCount, setGroupCount] = useState<number>(4);
  const [groupCapacity, setGroupCapacity] = useState<number>(4);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [useDefaultNames, setUseDefaultNames] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sportsRaw, defCats] = await Promise.all([
      sportApi.getByRaffle(raffleId),
      defaultCategoryApi.getAll(),
    ]);
    setDefaultCategories(defCats);
    const sportsWithData = await Promise.all(sportsRaw.map(async s => {
      const cats = await sportApi.getCategories(s.id);
      return { ...s, categories: cats, hasCategories: cats.length > 0 };
    }));
    setSports(sportsWithData);
    if (sportsWithData.length > 0 && !activeSport) setActiveSport(sportsWithData[0].id);
    setLoading(false);
  }, [raffleId, activeSport]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!activeSport) return;
    const sport = sports.find(s => s.id === activeSport);
    const catId = sport?.hasCategories ? (activeCategory ?? sport.categories[0]?.id ?? null) : null;
    void sportApi.getGroups(activeSport, catId).then(setGroups);
  }, [activeSport, activeCategory, sports]);

  const handleAddCategory = async () => {
    const finalName = catSourceType === 'predefined' ? selectedPredefinedCat : customCatName;
    if (!activeSport || !finalName?.trim()) {
      setCatError('Debés ingresar o seleccionar un nombre para la categoría');
      return;
    }

    setCatError(undefined);
    setSaving(true);
    try {
      await sportApi.createCategory(activeSport, { name: finalName.trim() });
      await load();
      closeCatModal();
      setCustomCatName('');
      setSelectedPredefinedCat(null);
    } catch {
      notifications.show({ message: 'Error al guardar categoría', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleCreateGroups = async () => {
    if (!activeSport) return;
    setSaving(true);
    const sport = sports.find(s => s.id === activeSport);
    const catId = sport?.hasCategories ? (activeCategory ?? sport?.categories[0]?.id ?? null) : null;
    try {
      const names = useDefaultNames
        ? Array.from({ length: groupCount }, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`)
        : groupNames.map((n, i) => n.trim() || `Grupo ${String.fromCharCode(65 + i)}`);

      await sportApi.createGroups(activeSport, names.map(n => ({ name: n, capacity: groupCapacity })), catId);
      const updated = await sportApi.getGroups(activeSport, catId);
      setGroups(updated);
      closeGroupModal();
    } catch {
      notifications.show({ message: 'Error al crear grupos', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  const currentSport = sports.find(s => s.id === activeSport);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fw={600} size="lg">Configuración de CATEGORÍAS</Text>
        <Button size="xs" color="orange" leftSection={<IconPlus size={14} />} onClick={() => { setCatError(undefined); openCatModal(); }}>
          Agregar categoría
        </Button>
      </Group>

      <Tabs value={activeSport} onChange={v => { setActiveSport(v); setActiveCategory(null); }}>
        <Tabs.List>
          {sports.map(s => <Tabs.Tab key={s.id} value={s.id}>{s.name}</Tabs.Tab>)}
        </Tabs.List>

        {sports.map(sport => (
          <Tabs.Panel key={sport.id} value={sport.id} pt="md">
            <Stack>
              {sport.categories.length > 0 && (
                <Tabs value={activeCategory ?? sport.categories[0]?.id ?? null} onChange={setActiveCategory}>
                  <Tabs.List mb="sm">
                    {sport.categories.map(c => <Tabs.Tab key={c.id} value={c.id}>{c.name}</Tabs.Tab>)}
                  </Tabs.List>
                </Tabs>
              )}

              {sport.categories.length === 0 && (
                <Text size="sm" c="dimmed">Sin categorías. Los grupos serán generales para este deporte.</Text>
              )}

              <Divider my="xs" />
              <Text fw={600} size="lg">Configuración de GRUPOS</Text>
              <Group justify="space-between">
                
                <Text size="sm" fw={500}>Grupos configurados ({groups.length})</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} color="orange" onClick={() => { setGroupCount(4); setGroupCapacity(4); setUseDefaultNames(true); setGroupNames([]); openGroupModal(); }}>
                  Crear grupos
                </Button>
              </Group>

              {groups.length === 0 ? (
                <Card withBorder radius="md" p="md" ta="center">
                  <Text c="dimmed" size="sm">No hay grupos configurados todavía.</Text>
                </Card>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  {groups.map(g => (
                    <Card key={g.id} withBorder radius="md" p="sm">
                      <Group justify="space-between">
                        <Box>
                          <Text fw={500} size="sm">{g.name}</Text>
                          <Text size="xs" c="dimmed">{g.capacity} equipos</Text>
                        </Box>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={async () => { await sportApi.deleteGroup(g.id); const catId = currentSport?.hasCategories ? (activeCategory ?? currentSport.categories[0]?.id ?? null) : null; setGroups(await sportApi.getGroups(sport.id, catId)); }}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={onBack}>← Volver</Button>
        <Button color="orange" leftSection={<IconCheck size={16} />} onClick={onDone}>
          Finalizar configuración
        </Button>
      </Group>

      {/* Category modal */}
      <Modal opened={catModalOpened} onClose={closeCatModal} title="Agregar categoría" centered>
        <Stack>
          <Text size="sm" c="dimmed">Elegí la procedencia de la nueva categoría para este deporte:</Text>
          <SegmentedControl
            value={catSourceType}
            onChange={v => { setCatSourceType(v as 'predefined' | 'custom'); setCatError(undefined); }}
            data={[
              { label: 'Usar Predefinida', value: 'predefined' },
              { label: 'Crear Nueva', value: 'custom' },
            ]}
          />

          {catSourceType === 'predefined' ? (
            <Select
              label="Seleccionar categoría del sistema"
              placeholder="Seleccioná una..."
              data={defaultCategories.map(c => ({ value: c.name, label: c.name }))}
              value={selectedPredefinedCat}
              onChange={v => { setSelectedPredefinedCat(v); setCatError(undefined); }}
              error={catError}
            />
          ) : (
            <TextInput
              label="Nombre de la nueva categoría"
              placeholder="Ej: Masculino, Femenino, Sub-20"
              value={customCatName}
              error={catError}
              onChange={e => {
                const val = e.currentTarget.value;
                setCustomCatName(val);
                if (val.trim()) setCatError(undefined);
              }}
              onKeyDown={e => e.key === 'Enter' && void handleAddCategory()}
              autoFocus
            />
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeCatModal}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleAddCategory()}>Agregar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Groups modal */}
      <Modal opened={groupModalOpened} onClose={closeGroupModal} title="Crear grupos" centered>
        <Stack>
          <NumberInput
            label="Cantidad de grupos"
            value={groupCount}
            min={1}
            max={20}
            onChange={v => {
              const newCount = Number(v);
              setGroupCount(newCount);
              setGroupNames(prev => {
                const next = [...prev];
                if (newCount > next.length) {
                  for (let i = next.length; i < newCount; i++) next.push('');
                } else {
                  next.length = newCount;
                }
                return next;
              });
            }}
          />
          <NumberInput label="Equipos por grupo" value={groupCapacity} min={1} max={50}
            onChange={v => setGroupCapacity(Number(v))} />
          <Select
            label="Nombres de los grupos"
            value={useDefaultNames ? 'default' : 'custom'}
            onChange={v => setUseDefaultNames(v === 'default')}
            data={[
              { value: 'default', label: 'Automático (Grupo A, B, C...)' },
              { value: 'custom', label: 'Personalizado' },
            ]}
          />
          {!useDefaultNames && (
            <Stack gap="xs">
              {Array.from({ length: groupCount }).map((_, i) => (
                <TextInput
                  key={i}
                  label={`Nombre del grupo ${i + 1}`}
                  placeholder={`Ej: Grupo ${String.fromCharCode(65 + i)}`}
                  value={groupNames[i] ?? ''}
                  onChange={e => {
                    const val = e.currentTarget.value;
                    setGroupNames(prev => { const n = [...prev]; n[i] = val; return n; });
                  }}
                  onKeyDown={e => e.key === 'Enter' && void handleCreateGroups()}
                />
              ))}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeGroupModal}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleCreateGroups()}>Crear grupos</Button>
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
  const [wizardDone, setWizardDone] = useState(false);
  const [startOpened, { open: openStart, close: closeStart }] = useDisclosure(false);
  const [starting, setStarting] = useState(false);
  const [editTab, setEditTab] = useState<string>('teams');

  useEffect(() => {
    if (!id) return;
    raffleApi.getById(id).then(r => {
      setRaffle(r);
      if (r.status !== 'pending') setWizardDone(true);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleStart = async () => {
    if (!raffle) return;
    setStarting(true);
    try {
      const updated = await raffleApi.start(raffle.id);
      setRaffle(updated);
      closeStart();
      setWizardDone(true);
    } catch {
      notifications.show({ message: 'Error al iniciar el sorteo', color: 'red' });
    } finally { setStarting(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;
  if (!raffle) return <Text>Sorteo no encontrado.</Text>;

  const isEditable = raffle.status === 'pending';

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
          {raffle.drawSlug && raffle.status === 'in_progress' && (
            <Button size="sm" color="orange" leftSection={<IconPlayerPlay size={14} />}
              onClick={() => navigate(`/sortear/${raffle.drawSlug}`)}>
              Ir al sorteo
            </Button>
          )}
          {isEditable && wizardDone && (
            <Button size="sm" color="green" leftSection={<IconPlayerPlay size={14} />} onClick={openStart}>
              Iniciar sorteo
            </Button>
          )}
        </Group>
      </Group>

      {/* Wizard primera vez */}
      {isEditable && !wizardDone ? (
        <Card withBorder radius="md" p="xl">
          <Stepper active={activeStep} color="orange" mb="xl">
            <Stepper.Step label="Equipos" icon={<IconUsers size={16} />} description="Cargá los equipos" />
            <Stepper.Step label="Deportes" icon={<IconRun size={16} />} description="Definí los deportes" />
            <Stepper.Step label="Grupos" icon={<IconCategory size={16} />} description="Configurá los grupos" />
          </Stepper>

          {activeStep === 0 && (
            <TeamsStep raffleId={raffle.id} onDone={() => setActiveStep(1)} />
          )}
          {activeStep === 1 && (
            <SportsStep raffleId={raffle.id} onDone={() => setActiveStep(2)} onBack={() => setActiveStep(0)} />
          )}
          {activeStep === 2 && (
            <GroupsStep raffleId={raffle.id} onDone={() => setWizardDone(true)} onBack={() => setActiveStep(1)} />
          )}
        </Card>
      ) : (
        /* Editor por secciones */
        <Tabs value={editTab} onChange={v => setEditTab(v ?? 'teams')}>
          <Tabs.List mb="md">
            <Tabs.Tab value="teams" leftSection={<IconUsers size={14} />}>Equipos</Tabs.Tab>
            <Tabs.Tab value="sports" leftSection={<IconRun size={14} />}>Deportes</Tabs.Tab>
            <Tabs.Tab value="groups" leftSection={<IconCategory size={14} />}>Grupos</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="teams">
            <TeamsStep raffleId={raffle.id} onDone={() => setEditTab('sports')} />
          </Tabs.Panel>
          <Tabs.Panel value="sports">
            <SportsStep raffleId={raffle.id} onDone={() => setEditTab('groups')} onBack={() => setEditTab('teams')} />
          </Tabs.Panel>
          <Tabs.Panel value="groups">
            <GroupsStep raffleId={raffle.id} onDone={() => {}} onBack={() => setEditTab('sports')} />
          </Tabs.Panel>
        </Tabs>
      )}

      {/* Start modal */}
      <Modal opened={startOpened} onClose={closeStart} title="Iniciar sorteo" centered>
        <Stack>
          <Text>
            Al iniciar el sorteo se generarán los links público y privado. Una vez iniciado, no podrás modificar la estructura de equipos, deportes y grupos.
          </Text>
          <Text fw={500}>¿Estás seguro que querés iniciar el sorteo <strong>{raffle.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeStart}>Cancelar</Button>
            <Button color="green" loading={starting} onClick={() => void handleStart()}>
              Iniciar sorteo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}