import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title, Text, Button, Group, Stack, Card, Badge, Box, 
  Stepper, Modal, TextInput, ActionIcon, Loader, Center,
  SimpleGrid, NumberInput, Tabs, Divider, SegmentedControl, Paper, Avatar, Tooltip, Checkbox,
  Table,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconTrash, IconEdit,
  IconExternalLink, IconArrowLeft, IconCheck, IconUsers,
  IconRun, IconCategory, IconShield, IconX, IconAlertTriangle, IconUserCheck, IconSearch,
} from '@tabler/icons-react';
import { raffleApi } from '@/api/raffleApi';
import { raffleTeamApi } from '@/api/raffleTeamApi';
import { sportApi } from '@/api/sportApi';
import { defaultSportApi } from '@/api/defaultSportApi';
import { globalTeamApi } from '@/api/globalTeamApi';
import { defaultCategoryApi } from '@/api/defaultCategoryApi';
import { systemConfigApi } from '@/api/systemConfigApi';
import { notifications } from '@mantine/notifications';
import type {
  Raffle, RaffleTeam, Sport, SportCategory,
  SportCategoryGroup, GlobalTeam, DefaultCategory, SportCategoryTeam, DefaultSport, SystemConfig,
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

function getSequenceSuffix(index: number, sequence: string = 'ALPHA_UPPER'): string {
  switch (sequence) {
    case 'NUMERIC':
      return String(index + 1);
    case 'ALPHA_LOWER':
      return String.fromCharCode(97 + index);
    case 'ROMAN': {
      const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
      return romans[index] || String(index + 1);
    }
    case 'ALPHA_UPPER':
    default:
      return String.fromCharCode(65 + index);
  }
}

// ── Paso 1: Pool General de Equipos ──────────────────────────────────────────
function TeamsStep({ raffleId, onDone }: { raffleId: string; onDone: () => void }) {
  const [teams, setTeams] = useState<RaffleTeam[]>([]);
  const [globalTeams, setGlobalTeams] = useState<GlobalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [sourceType, setSourceType] = useState<'system' | 'custom'>('system');
  const [editTarget, setEditTarget] = useState<RaffleTeam | null>(null);

  const [selectedGlobal, setSelectedGlobal] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({ name: '', abbreviation: '', imagePath: '' });
  const [errors, setErrors] = useState<{ name?: string; abbreviation?: string }>({});

  const [deleteTarget, setDeleteTarget] = useState<RaffleTeam | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteAllOpened, { open: openDeleteAll, close: closeDeleteAll }] = useDisclosure(false);
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

  const filteredGlobalTeams = availableGlobalTeams.filter(
    gt => gt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          gt.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleSelectAll = () => {
    if (selectedGlobal.length === availableGlobalTeams.length) {
      setSelectedGlobal([]);
    } else {
      setSelectedGlobal(availableGlobalTeams.map(t => t.id));
    }
  };

  const handleImport = async () => {
    if (!selectedGlobal.length) return;
    setSaving(true);
    try {
      await raffleTeamApi.importFromGlobal(raffleId, selectedGlobal);
      await load();
      closeModal();
      setSelectedGlobal([]);
      setSearchQuery('');
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al importar equipos', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleSaveCustom = async () => {
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
      closeModal();
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
        <Text fw={500}>Pool de Equipos del sorteo ({teams.length})</Text>
        <Group gap="xs">
          {teams.length > 0 && (
            <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAll}>
              Borrar todos
            </Button>
          )}
          <Button
            ref={addBtnRef}
            size="xs"
            leftSection={<IconPlus size={14} />}
            color="orange"
            onClick={() => {
              setEditTarget(null);
              setSourceType('system');
              setForm({ name: '', abbreviation: '', imagePath: '' });
              setErrors({});
              setSelectedGlobal([]);
              setSearchQuery('');
              openModal();
            }}
          >
            Agregar equipo
          </Button>
        </Group>
      </Group>

      {teams.length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <Text c="dimmed" size="sm" mb="md">Todavía no hay equipos cargados en el sorteo.</Text>
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
                  <ActionIcon size="sm" variant="subtle" color="orange" onClick={() => {
                    setEditTarget(team);
                    setSourceType('custom');
                    setForm({ name: team.name, abbreviation: team.abbreviation, imagePath: team.imagePath || '' });
                    setErrors({});
                    openModal();
                  }}>
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

      <Modal
        opened={modalOpened}
        onClose={() => { closeModal(); setTimeout(() => addBtnRef.current?.focus(), 100); }}
        title={editTarget ? 'Editar equipo' : 'Agregar equipos al pool'}
        centered
      >
        <Stack gap="md">
          {!editTarget && (
            <SegmentedControl
              value={sourceType}
              onChange={v => setSourceType(v as 'system' | 'custom')}
              data={[
                { label: 'Equipos del sistema', value: 'system' },
                { label: 'Equipo personalizado', value: 'custom' },
              ]}
            />
          )}

          {sourceType === 'system' && !editTarget ? (
            <Stack gap="xs">
              <TextInput
                placeholder="Buscar equipo..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  {selectedGlobal.length} de {availableGlobalTeams.length} seleccionados
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handleToggleSelectAll}
                  disabled={availableGlobalTeams.length === 0}
                >
                  {selectedGlobal.length === availableGlobalTeams.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                </Button>
              </Group>

              <Paper withBorder p="xs" radius="md" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredGlobalTeams.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    {availableGlobalTeams.length === 0
                      ? 'Todos los equipos del sistema ya están en este sorteo.'
                      : 'No se encontraron equipos que coincidan.'}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {filteredGlobalTeams.map(t => (
                      <Checkbox
                        key={t.id}
                        label={`${t.name} (${t.abbreviation})`}
                        checked={selectedGlobal.includes(t.id)}
                        onChange={e => {
                          if (e.currentTarget.checked) {
                            setSelectedGlobal(prev => [...prev, t.id]);
                          } else {
                            setSelectedGlobal(prev => prev.filter(id => id !== t.id));
                          }
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>

              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={closeModal}>Cancelar</Button>
                <Button color="orange" loading={saving} disabled={selectedGlobal.length === 0} onClick={() => void handleImport()}>
                  Importar seleccionados ({selectedGlobal.length})
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="xs">
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
                onKeyDown={e => e.key === 'Enter' && void handleSaveCustom()}
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
                onKeyDown={e => e.key === 'Enter' && void handleSaveCustom()}
              />
              <ImageUploadInput
                label="Logo / Escudo del equipo (opcional)"
                value={form.imagePath}
                onChange={path => setForm(f => ({ ...f, imagePath: path || '' }))}
              />
              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={closeModal}>Cancelar</Button>
                <Button color="orange" loading={saving} onClick={() => void handleSaveCustom()}>Guardar</Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDelete} title="Eliminar equipo" centered>
        <Stack>
          <Text>¿Eliminar el equipo <strong>{deleteTarget?.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDelete()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteAllOpened} onClose={closeDeleteAll} title="Eliminar todos los equipos" centered>
        <Stack>
          <Text>¿Estás seguro de que querés eliminar <strong>todos los equipos</strong> de este sorteo?</Text>
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
  const [defaultSports, setDefaultSports] = useState<DefaultSport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [sourceType, setSourceType] = useState<'system' | 'custom'>('system');
  const [editTarget, setEditTarget] = useState<Sport | null>(null);

  const [selectedDefaultSports, setSelectedDefaultSports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({ name: '' });
  const [errors, setErrors] = useState<{ name?: string }>({});

  const [deleteTarget, setDeleteTarget] = useState<Sport | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteAllOpened, { open: openDeleteAll, close: closeDeleteAll }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const addBtnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, defSports] = await Promise.all([
        sportApi.getByRaffle(raffleId),
        defaultSportApi.getAll(),
      ]);
      setSports(data);
      setDefaultSports(defSports);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al cargar los deportes', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [raffleId]);

  useEffect(() => { void load(); }, [load]);

  const availableDefaultSports = defaultSports.filter(
    ds => !sports.some(s => s.name.toLowerCase() === ds.name.toLowerCase())
  );

  const filteredDefaultSports = availableDefaultSports.filter(
    ds => ds.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleSelectAll = () => {
    if (selectedDefaultSports.length === availableDefaultSports.length) {
      setSelectedDefaultSports([]);
    } else {
      setSelectedDefaultSports(availableDefaultSports.map(s => s.name));
    }
  };

  const handleImport = async () => {
    if (!selectedDefaultSports.length) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedDefaultSports.map((name, idx) =>
          sportApi.createSport(raffleId, { name, order: sports.length + idx })
        )
      );
      await load();
      closeAdd();
      setSelectedDefaultSports([]);
      setSearchQuery('');
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al importar deportes', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleSaveCustom = async () => {
    const trimName = form.name.trim();
    if (!trimName) {
      setErrors({ name: 'El nombre es obligatorio' });
      return;
    }

    const nameExists = sports.some(
      s => s.id !== editTarget?.id && s.name.trim().toLowerCase() === trimName.toLowerCase()
    );
    if (nameExists) {
      setErrors({ name: 'Este deporte ya está registrado en este sorteo' });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      if (editTarget) await sportApi.updateSport(editTarget.id, { name: trimName });
      else await sportApi.createSport(raffleId, { name: trimName, order: sports.length });
      await load();
      closeAdd();
      setForm({ name: '' });
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
      setDeleteTarget(null);
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
          <Button
            ref={addBtnRef}
            size="xs"
            leftSection={<IconPlus size={14} />}
            color="orange"
            onClick={() => {
              setEditTarget(null);
              setSourceType('system');
              setForm({ name: '' });
              setErrors({});
              setSelectedDefaultSports([]);
              setSearchQuery('');
              openAdd();
            }}
          >
            Agregar deporte
          </Button>
        </Group>
      </Group>

      {sports.length === 0 ? (
        <Card withBorder radius="md" p="lg" ta="center">
          <Text c="dimmed" size="sm">Todavía no hay deportes cargados.</Text>
        </Card>
      ) : (
        <Stack gap="xs">
          {sports.map(sport => (
            <Card key={sport.id} withBorder radius="md" p="sm">
              <Group justify="space-between">
                <Box>
                  <Text fw={500} size="sm">{sport.name}</Text>
                </Box>
                <Group gap={4}>
                  <ActionIcon size="sm" variant="subtle" color="orange" onClick={() => {
                    setEditTarget(sport);
                    setSourceType('custom');
                    setForm({ name: sport.name });
                    setErrors({});
                    openAdd();
                  }}>
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
          Siguiente: Categorías, Equipos y Grupos →
        </Button>
      </Group>

      <Modal
        opened={addOpened}
        onClose={() => { closeAdd(); setTimeout(() => addBtnRef.current?.focus(), 100); }}
        title={editTarget ? 'Editar deporte' : 'Agregar deportes al sorteo'}
        centered
      >
        <Stack gap="md">
          {!editTarget && (
            <SegmentedControl
              value={sourceType}
              onChange={v => setSourceType(v as 'system' | 'custom')}
              data={[
                { label: 'Deportes del sistema', value: 'system' },
                { label: 'Deporte personalizado', value: 'custom' },
              ]}
            />
          )}

          {sourceType === 'system' && !editTarget ? (
            <Stack gap="xs">
              <TextInput
                placeholder="Buscar deporte..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  {selectedDefaultSports.length} de {availableDefaultSports.length} seleccionados
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handleToggleSelectAll}
                  disabled={availableDefaultSports.length === 0}
                >
                  {selectedDefaultSports.length === availableDefaultSports.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                </Button>
              </Group>

              <Paper withBorder p="xs" radius="md" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredDefaultSports.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    {availableDefaultSports.length === 0
                      ? 'Todos los deportes del sistema ya están en este sorteo.'
                      : 'No se encontraron deportes que coincidan.'}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {filteredDefaultSports.map(s => (
                      <Checkbox
                        key={s.id || s.name}
                        label={s.name}
                        checked={selectedDefaultSports.includes(s.name)}
                        onChange={e => {
                          if (e.currentTarget.checked) {
                            setSelectedDefaultSports(prev => [...prev, s.name]);
                          } else {
                            setSelectedDefaultSports(prev => prev.filter(name => name !== s.name));
                          }
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>

              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={closeAdd}>Cancelar</Button>
                <Button color="orange" loading={saving} disabled={selectedDefaultSports.length === 0} onClick={() => void handleImport()}>
                  Importar seleccionados ({selectedDefaultSports.length})
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="xs">
              <TextInput
                data-autofocus
                label="Nombre del deporte"
                placeholder="Ej: Fútbol"
                value={form.name}
                error={errors.name}
                onChange={e => {
                  const val = e.target.value;
                  setForm({ name: val });
                  if (val.trim()) setErrors({});
                }}
                onKeyDown={e => e.key === 'Enter' && void handleSaveCustom()}
              />
              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={closeAdd}>Cancelar</Button>
                <Button color="orange" loading={saving} onClick={() => void handleSaveCustom()}>Guardar</Button>
              </Group>
            </Stack>
          )}
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
          <Text>¿Estás seguro de que querés eliminar <strong>todos los deportes</strong> de este sorteo?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAll}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAll()}>Eliminar todos</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Paso 3: Categorías, Inscripción de Equipos y Grupos ────────────────────────
function GroupsStep({ raffleId, onDone, onBack }: { raffleId: string; onDone: () => void; onBack: () => void }) {
  const [sports, setSports] = useState<SportWithData[]>([]);
  const [raffleTeams, setRaffleTeams] = useState<RaffleTeam[]>([]);
  const [defaultCategories, setDefaultCategories] = useState<DefaultCategory[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const [sportCategoryMap, setSportCategoryMap] = useState<Record<string, string>>({});
  const [assignedTeams, setAssignedTeams] = useState<SportCategoryTeam[]>([]);
  const [groups, setGroups] = useState<SportCategoryGroup[]>([]);
  
  const [catModalOpened, { open: openCatModal, close: closeCatModal }] = useDisclosure(false);
  const [renameCatTarget, setRenameCatTarget] = useState<SportCategory | null>(null);
  const [renameCatName, setRenameCatName] = useState('');
  const [renameCatError, setRenameCatError] = useState<string | undefined>(undefined);
  const [renameCatOpened, { open: openRenameCat, close: closeRenameCat }] = useDisclosure(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState<SportCategory | null>(null);
  const [deleteCatOpened, { open: openDeleteCat, close: closeDeleteCat }] = useDisclosure(false);
  const [deleteAllCatsOpened, { open: openDeleteAllCats, close: closeDeleteAllCats }] = useDisclosure(false);

  const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
  const [selectedTeamsToAssign, setSelectedTeamsToAssign] = useState<string[]>([]);
  const [searchAssignQuery, setSearchAssignQuery] = useState('');
  const [deleteAllAssignedOpened, { open: openDeleteAllAssigned, close: closeDeleteAllAssigned }] = useDisclosure(false);

  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [deleteAllGroupsOpened, { open: openDeleteAllGroups, close: closeDeleteAllGroups }] = useDisclosure(false);

  const sportsTabsListRef = useRef<HTMLDivElement>(null);
  const catsTabsListRef = useRef<HTMLDivElement>(null);
  const addCatBtnRef = useRef<HTMLButtonElement>(null);

  const [catSourceType, setCatSourceType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPredefinedCats, setSelectedPredefinedCats] = useState<string[]>([]);
  const [searchCatQuery, setSearchCatQuery] = useState('');
  const [customCatName, setCustomCatName] = useState('');
  const [catError, setCatError] = useState<string | undefined>(undefined);

  const [groupCount, setGroupCount] = useState<number>(4);
  const [baseCapacity, setBaseCapacity] = useState<number>(4);
  const [groupItems, setGroupItems] = useState<{ name: string; capacity: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const currentSport = sports.find(s => s.id === activeSport);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [sportsRaw, defCats, rTeams, sysConfig] = await Promise.all([
        sportApi.getByRaffle(raffleId),
        defaultCategoryApi.getAll(),
        raffleTeamApi.getByRaffle(raffleId),
        systemConfigApi.get(),
      ]);
      setDefaultCategories(defCats);
      setRaffleTeams(rTeams);
      setSystemConfig(sysConfig);

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

  const refreshSportData = useCallback(async () => {
    if (!activeSport) return;
    const catId = currentSport?.hasCategories ? activeCategoryVal : null;
    try {
      const [assigned, grps] = await Promise.all([
        sportApi.getAssignedTeams(activeSport, catId),
        sportApi.getGroups(activeSport, catId),
      ]);
      setAssignedTeams(assigned);
      setGroups(grps);
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
    }
  }, [activeSport, activeCategoryVal, currentSport]);

  useEffect(() => {
    void refreshSportData();
  }, [refreshSportData]);

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

  const unassignedRaffleTeams = raffleTeams.filter(
    rt => !assignedTeams.some(at => at.raffleTeamId === rt.id)
  );

  const filteredUnassignedTeams = unassignedRaffleTeams.filter(
    t => t.name.toLowerCase().includes(searchAssignQuery.toLowerCase()) ||
         t.abbreviation.toLowerCase().includes(searchAssignQuery.toLowerCase())
  );

  const handleToggleSelectAllAssign = () => {
    if (selectedTeamsToAssign.length === unassignedRaffleTeams.length) {
      setSelectedTeamsToAssign([]);
    } else {
      setSelectedTeamsToAssign(unassignedRaffleTeams.map(t => t.id));
    }
  };

  const handleAssignTeams = async () => {
    if (!activeSport || selectedTeamsToAssign.length === 0) return;
    setSaving(true);
    const catId = currentSport?.hasCategories ? activeCategoryVal : null;
    try {
      await Promise.all(
        selectedTeamsToAssign.map(teamId => sportApi.assignTeam(activeSport, teamId, catId))
      );
      await refreshSportData();
      closeAssignModal();
      setSelectedTeamsToAssign([]);
      setSearchAssignQuery('');
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al inscribir equipos', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleRemoveTeamAssignment = async (assignmentId: string) => {
    try {
      await sportApi.removeTeamAssignment(assignmentId);
      await refreshSportData();
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al desinscribir equipo', color: 'red' });
    }
  };

  const handleDeleteAllAssigned = async () => {
    setSaving(true);
    try {
      await Promise.all(assignedTeams.map(at => sportApi.removeTeamAssignment(at.id)));
      await refreshSportData();
      closeDeleteAllAssigned();
      notifications.show({ message: 'Se desinscribieron todos los equipos de esta sección', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al desinscribir los equipos', color: 'red' });
    } finally { setSaving(false); }
  };

  const availableDefCats = defaultCategories.filter(
    dc => !currentSport?.categories.some(c => c.name.toLowerCase() === dc.name.toLowerCase())
  );

  const filteredDefCats = availableDefCats.filter(
    dc => dc.name.toLowerCase().includes(searchCatQuery.toLowerCase())
  );

  const handleToggleSelectAllCats = () => {
    if (selectedPredefinedCats.length === availableDefCats.length) {
      setSelectedPredefinedCats([]);
    } else {
      setSelectedPredefinedCats(availableDefCats.map(c => c.name));
    }
  };

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
        setSearchCatQuery('');
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

  const handleGroupConfigChange = (newCount: number, newBaseCap: number) => {
    setGroupCount(newCount);
    setBaseCapacity(newBaseCap);

    const prefix = systemConfig?.defaultGroupPrefix || 'Grupo';
    const sequence = systemConfig?.defaultGroupSequence || 'ALPHA_UPPER';

    setGroupItems(prev => {
      return Array.from({ length: newCount }).map((_, i) => {
        const defaultName = `${prefix} ${getSequenceSuffix(i, sequence)}`;
        const existing = prev[i];
        return {
          name: existing?.name || defaultName,
          capacity: existing?.capacity || newBaseCap,
        };
      });
    });
  };

  const handleOpenGroupModal = () => {
    const initCount = Math.min(4, maxGroupsAllowed || 4);
    const initCap = 4;
    handleGroupConfigChange(initCount, initCap);
    openGroupModal();
  };

  const handleCreateGroups = async () => {
    if (!activeSport || groupItems.length === 0) return;
    setSaving(true);
    const catId = currentSport?.hasCategories ? activeCategoryVal : null;
    try {
      await sportApi.createGroups(activeSport, groupItems, catId);
      await refreshSportData();
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
      await refreshSportData();
      closeDeleteAllGroups();
      notifications.show({ message: 'Todos los grupos fueron eliminados', color: 'blue' });
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al eliminar grupos', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleFinish = async () => {
    setValidating(true);
    try {
      for (const sport of sports) {
        if (sport.categories && sport.categories.length > 0) {
          for (const cat of sport.categories) {
            const grps = await sportApi.getGroups(sport.id, cat.id);
            if (!grps || grps.length === 0) {
              notifications.show({
                title: 'Configuración incompleta',
                message: `La categoría "${cat.name}" del deporte "${sport.name}" no tiene grupos configurados.`,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
              });
              setActiveSport(sport.id);
              setSportCategoryMap(prev => ({ ...prev, [sport.id]: cat.id }));
              setValidating(false);
              return;
            }
          }
        } else {
          const grps = await sportApi.getGroups(sport.id, null);
          if (!grps || grps.length === 0) {
            notifications.show({
              title: 'Configuración incompleta',
              message: `El deporte "${sport.name}" no tiene grupos configurados.`,
              color: 'red',
              icon: <IconAlertTriangle size={18} />,
            });
            setActiveSport(sport.id);
            setValidating(false);
            return;
          }
        }
      }

      onDone();
    } catch (err: any) {
      if (err?.response?.status === 429) show429Notification();
      else notifications.show({ message: 'Error al validar la configuración', color: 'red' });
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  const assignedCount = assignedTeams.length;
  const maxGroupsAllowed = assignedCount > 0 ? assignedCount : 20;
  const calculatedTotalCapacity = groupItems.reduce((acc, g) => acc + (g.capacity || 0), 0);
  const capacityExceeds = assignedCount > 0 && calculatedTotalCapacity > assignedCount;

  return (
    <Stack gap="md">
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

      <Paper withBorder radius="md" p="md">
        <Stack gap="lg">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Text fw={600} size="sm">Categorías:</Text>
                {currentSport?.categories.length === 0 && (
                  <Text size="sm" c="dimmed">Sin categorías</Text>
                )}
              </Group>
              <Group gap="xs">
                {currentSport && currentSport.categories.length > 0 && (
                  <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAllCats}>
                    Borrar categorías
                  </Button>
                )}
                <Button
                  ref={addCatBtnRef}
                  size="xs"
                  color="orange"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => {
                    setCatError(undefined);
                    setSelectedPredefinedCats([]);
                    setSearchCatQuery('');
                    setCustomCatName('');
                    setCatSourceType('predefined');
                    openCatModal();
                  }}
                >
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

          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={600} size="md">
                  Equipos inscriptos ({assignedTeams.length})
                </Text>
                <Text size="xs" c="dimmed">
                  {currentSport?.name} {currentSport?.hasCategories ? `• ${currentSport.categories.find(c => c.id === activeCategoryVal)?.name ?? ''}` : ''}
                </Text>
              </Box>

              <Group gap="xs">
                {assignedTeams.length > 0 && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={openDeleteAllAssigned}
                  >
                    Borrar inscriptos
                  </Button>
                )}
                <Button size="xs" color="orange" leftSection={<IconUserCheck size={14} />} onClick={() => { setSelectedTeamsToAssign([]); setSearchAssignQuery(''); openAssignModal(); }}>
                  Inscribir equipos ({unassignedRaffleTeams.length} disponibles)
                </Button>
              </Group>
            </Group>

            {assignedTeams.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" py="md">
                Todavía no hay equipos inscriptos en esta categoría.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {assignedTeams.map(at => {
                  const teamInfo = raffleTeams.find(rt => rt.id === at.raffleTeamId) || at.raffleTeam;
                  return (
                    <Card key={at.id} withBorder radius="md" p="xs">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Avatar src={getImageUrl(teamInfo?.imagePath)} radius="xl" size="xs">
                            <IconShield size={12} />
                          </Avatar>
                          <Box>
                            <Text fw={500} size="xs">{teamInfo?.name || 'Equipo'}</Text>
                            <Text size="10px" c="dimmed">{teamInfo?.abbreviation}</Text>
                          </Box>
                        </Group>
                        <ActionIcon size="xs" variant="subtle" color="red" onClick={() => void handleRemoveTeamAssignment(at.id)}>
                          <IconX size={12} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>

          <Divider />

          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={600} size="md">Grupos configurados ({groups.length})</Text>
                <Text size="xs" c="dimmed">
                  Bolsa del sorteo: {assignedTeams.length} equipos inscriptos
                </Text>
              </Box>
              <Group gap="xs">
                {groups.length > 0 && (
                  <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteAllGroups}>
                    Borrar todos
                  </Button>
                )}
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  color="orange"
                  disabled={assignedTeams.length === 0}
                  onClick={handleOpenGroupModal}
                >
                  Crear grupos
                </Button>
              </Group>
            </Group>

            {groups.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" py="lg">Todavía no hay grupos configurados.</Text>
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
                          await refreshSportData();
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

        </Stack>
      </Paper>

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={onBack}>← Volver</Button>
        <Button
          color="orange"
          leftSection={<IconCheck size={16} />}
          loading={validating}
          onClick={() => void handleFinish()}
        >
          Finalizar configuración
        </Button>
      </Group>

      <Modal opened={assignModalOpened} onClose={closeAssignModal} title={`Inscribir equipos en ${currentSport?.name}`} centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Seleccioná los equipos del pool general que participarán en esta categoría/deporte.
          </Text>

          <Stack gap="xs">
            <TextInput
              placeholder="Buscar equipo del pool..."
              leftSection={<IconSearch size={16} />}
              value={searchAssignQuery}
              onChange={e => setSearchAssignQuery(e.target.value)}
            />
            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                {selectedTeamsToAssign.length} de {unassignedRaffleTeams.length} seleccionados
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleToggleSelectAllAssign}
                disabled={unassignedRaffleTeams.length === 0}
              >
                {selectedTeamsToAssign.length === unassignedRaffleTeams.length ? 'Desmarcar todos' : 'Seleccionar todos'}
              </Button>
            </Group>

            <Paper withBorder p="xs" radius="md" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {filteredUnassignedTeams.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  {unassignedRaffleTeams.length === 0
                    ? 'Todos los equipos del pool ya están inscriptos en esta disciplina.'
                    : 'No se encontraron equipos que coincidan.'}
                </Text>
              ) : (
                <Stack gap="xs">
                  {filteredUnassignedTeams.map(t => (
                    <Checkbox
                      key={t.id}
                      label={`${t.name} (${t.abbreviation})`}
                      checked={selectedTeamsToAssign.includes(t.id)}
                      onChange={e => {
                        if (e.currentTarget.checked) {
                          setSelectedTeamsToAssign(prev => [...prev, t.id]);
                        } else {
                          setSelectedTeamsToAssign(prev => prev.filter(id => id !== t.id));
                        }
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Paper>

            <Group justify="flex-end" mt="xs">
              <Button variant="subtle" onClick={closeAssignModal}>Cancelar</Button>
              <Button color="orange" loading={saving} disabled={selectedTeamsToAssign.length === 0} onClick={() => void handleAssignTeams()}>
                Inscribir seleccionados ({selectedTeamsToAssign.length})
              </Button>
            </Group>
          </Stack>
        </Stack>
      </Modal>

      <Modal opened={deleteAllAssignedOpened} onClose={closeDeleteAllAssigned} title="Desinscribir todos los equipos" centered>
        <Stack>
          <Text>
            ¿Estás seguro de que querés desinscribir <strong>todos los equipos ({assignedTeams.length})</strong> de esta sección?
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAllAssigned}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAllAssigned()}>Desinscribir todos</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={catModalOpened} onClose={() => { closeCatModal(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }} title="Agregar categorías" centered>
        <Stack gap="md">
          <SegmentedControl
            value={catSourceType}
            onChange={v => { setCatSourceType(v as 'predefined' | 'custom'); setCatError(undefined); }}
            data={[
              { label: 'Categorías del sistema', value: 'predefined' },
              { label: 'Categoría personalizada', value: 'custom' },
            ]}
          />

          {catSourceType === 'predefined' ? (
            <Stack gap="xs">
              <TextInput
                placeholder="Buscar categoría..."
                leftSection={<IconSearch size={16} />}
                value={searchCatQuery}
                onChange={e => setSearchCatQuery(e.target.value)}
              />
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  {selectedPredefinedCats.length} de {availableDefCats.length} seleccionadas
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handleToggleSelectAllCats}
                  disabled={availableDefCats.length === 0}
                >
                  {selectedPredefinedCats.length === availableDefCats.length ? 'Desmarcar todas' : 'Seleccionar todas'}
                </Button>
              </Group>

              <Paper withBorder p="xs" radius="md" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredDefCats.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    {availableDefCats.length === 0
                      ? 'Todas las categorías del sistema ya están en este deporte.'
                      : 'No se encontraron categorías que coincidan.'}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {filteredDefCats.map(c => (
                      <Checkbox
                        key={c.id || c.name}
                        label={c.name}
                        checked={selectedPredefinedCats.includes(c.name)}
                        onChange={e => {
                          if (e.currentTarget.checked) {
                            setSelectedPredefinedCats(prev => [...prev, c.name]);
                          } else {
                            setSelectedPredefinedCats(prev => prev.filter(name => name !== c.name));
                          }
                          setCatError(undefined);
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>

              {catError && <Text size="xs" c="red">{catError}</Text>}

              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={() => { closeCatModal(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }}>Cancelar</Button>
                <Button color="orange" loading={saving} disabled={selectedPredefinedCats.length === 0} onClick={() => void handleAddCategory()}>
                  Agregar seleccionadas ({selectedPredefinedCats.length})
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="xs">
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
              <Group justify="flex-end" mt="xs">
                <Button variant="subtle" onClick={() => { closeCatModal(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }}>Cancelar</Button>
                <Button color="orange" loading={saving} onClick={() => void handleAddCategory()}>Guardar</Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>

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

      <Modal opened={deleteCatOpened} onClose={closeDeleteCat} title="Eliminar categoría" centered>
        <Stack>
          <Text>¿Eliminar la categoría <strong>{deleteCatTarget?.name}</strong> de {currentSport?.name}? Se eliminarán los grupos y asignaciones asociadas.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteCat}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteCategory()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteAllCatsOpened} onClose={closeDeleteAllCats} title="Eliminar todas las categorías" centered>
        <Stack>
          <Text>¿Estás seguro de eliminar <strong>todas las categorías</strong> de {currentSport?.name}?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteAllCats}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteAllCategories()}>Eliminar todas</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Creación de Grupos (UX Rediseñada) */}
      <Modal
        opened={groupModalOpened}
        onClose={closeGroupModal}
        title="Configurar Grupos"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Paper
            withBorder
            p="sm"
            radius="md"
            bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label="Cantidad de grupos"
                placeholder="Ej: 4"
                value={groupCount}
                min={1}
                max={maxGroupsAllowed}
                onChange={v => handleGroupConfigChange(Number(v) || 1, baseCapacity)}
              />
              <NumberInput
                label="Capacidad base por grupo"
                placeholder="Ej: 4"
                value={baseCapacity}
                min={1}
                max={assignedCount > 0 ? assignedCount : 50}
                onChange={v => {
                  const newCap = Number(v) || 1;
                  setBaseCapacity(newCap);
                  setGroupItems(prev => prev.map(g => ({ ...g, capacity: newCap })));
                }}
              />
            </SimpleGrid>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Group justify="space-between" align="center">
              <Group gap="lg">
                <Box>
                  <Text size="xs" c="dimmed">Equipos inscriptos</Text>
                  <Text fw={700} size="sm">{assignedCount}</Text>
                </Box>
                <Divider orientation="vertical" />
                <Box>
                  <Text size="xs" c="dimmed">Capacidad total</Text>
                  <Text fw={700} size="sm" c={capacityExceeds ? 'red' : 'green'}>
                    {calculatedTotalCapacity} cupos
                  </Text>
                </Box>
              </Group>

              {capacityExceeds ? (
                <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={12} />}>
                  Sobra capacidad (+{calculatedTotalCapacity - assignedCount})
                </Badge>
              ) : calculatedTotalCapacity < assignedCount ? (
                <Badge color="orange" variant="light">
                  Faltan cupos ({assignedCount - calculatedTotalCapacity})
                </Badge>
              ) : (
                <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                  Cupos exactos
                </Badge>
              )}
            </Group>
          </Paper>

          <Box>
            <Text size="xs" fw={600} c="dimmed" mb={6}>
              VISTA PREVIA Y PERSONALIZACIÓN DE GRUPOS
            </Text>
            <Paper withBorder radius="md" style={{ height: 220, overflowY: 'auto' }}>
              <Table verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>#</Table.Th>
                    <Table.Th>Nombre del grupo</Table.Th>
                    <Table.Th style={{ width: 140 }}>Capacidad</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groupItems.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="xs" c="dimmed" fw={600}>{idx + 1}</Text>
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={item.name}
                          placeholder={`${systemConfig?.defaultGroupPrefix || 'Grupo'} ${getSequenceSuffix(idx, systemConfig?.defaultGroupSequence)}`}
                          onChange={e => {
                            const val = e.target.value;
                            setGroupItems(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], name: val };
                              return copy;
                            });
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          value={item.capacity}
                          min={1}
                          max={50}
                          onChange={v => {
                            const val = Number(v) || 1;
                            setGroupItems(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], capacity: val };
                              return copy;
                            });
                          }}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Box>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={closeGroupModal}>
              Cancelar
            </Button>
            <Button
              color="orange"
              loading={saving}
              disabled={calculatedTotalCapacity !== assignedCount}
              onClick={() => void handleCreateGroups()}
            >
              Crear {groupCount} {groupCount === 1 ? 'grupo' : 'grupos'}
            </Button>
          </Group>
        </Stack>
      </Modal>

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
      if (r.status === 'in_progress' || r.status === 'finished') {
        notifications.show({
          id: 'raffle-not-editable-toast', // ← Evita duplicados en Mantine
          title: 'Sorteo no editable',
          message: 'Los sorteos en progreso o finalizados no se pueden editar.',
          color: 'red',
          icon: <IconAlertTriangle size={18} />,
        });
        navigate('/raffles');
        return;
      }

      if (r.status === 'configured') {
        const resetRaffle = await raffleApi.update(r.id, { status: 'pending' });
        setRaffle(resetRaffle);
      } else {
        setRaffle(r);
      }
    }).catch(err => {
      if (err?.response?.status === 429) show429Notification();
    }).finally(() => setLoading(false));
  }, [id, navigate]);

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

      <Card withBorder radius="md" p="xl">
        <Stepper active={activeStep} color="orange" mb="xl">
          <Stepper.Step label="Pool de equipos" icon={<IconUsers size={16} />} description="participantes del torneo." />
          <Stepper.Step label="Deportes" icon={<IconRun size={16} />} description="en los que se compite." />
          <Stepper.Step label="Grupos" icon={<IconCategory size={16} />} description="según deporte y categoría." />
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