import { useEffect, useState } from 'react';
import {
  Title, Text, Button, Group, Stack, Card, TextInput,
  Box, Tabs, Loader, Center, ActionIcon, Modal, SimpleGrid, Avatar,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import { systemConfigApi } from '@/api/systemConfigApi';
import { defaultCategoryApi } from '@/api/defaultCategoryApi';
import { globalTeamApi } from '@/api/globalTeamApi';
import { notifications } from '@mantine/notifications';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { getImageUrl } from '@/utils/imageUrl';
import type { SystemConfig, DefaultCategory, GlobalTeam } from '@/types/api.types';

export function SystemConfigPage() {
  const [, setConfig] = useState<SystemConfig | null>(null);
  const [configForm, setConfigForm] = useState<Partial<SystemConfig>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Categories
  const [categories, setCategories] = useState<DefaultCategory[]>([]);
  const [catForm, setCatForm] = useState({ name: '' });
  const [catError, setCatError] = useState<string | undefined>(undefined);
  const [editCat, setEditCat] = useState<DefaultCategory | null>(null);
  const [deleteCat, setDeleteCat] = useState<DefaultCategory | null>(null);
  const [catOpened, { open: openCat, close: closeCat }] = useDisclosure(false);
  const [deleteCatOpened, { open: openDeleteCat, close: closeDeleteCat }] = useDisclosure(false);

  // Global teams
  const [teams, setTeams] = useState<GlobalTeam[]>([]);
  const [teamForm, setTeamForm] = useState({ name: '', abbreviation: '', imagePath: '' });
  const [teamErrors, setTeamErrors] = useState<{ name?: string; abbreviation?: string }>({});
  const [editTeam, setEditTeam] = useState<GlobalTeam | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<GlobalTeam | null>(null);
  const [teamOpened, { open: openTeam, close: closeTeam }] = useDisclosure(false);
  const [deleteTeamOpened, { open: openDeleteTeam, close: closeDeleteTeam }] = useDisclosure(false);

  useEffect(() => {
    Promise.all([
      systemConfigApi.get(),
      defaultCategoryApi.getAll(),
      globalTeamApi.getAll(),
    ]).then(([cfg, cats, ts]) => {
      setConfig(cfg);
      setConfigForm(cfg);
      setCategories(cats);
      setTeams(ts);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const updated = await systemConfigApi.update(configForm);
      setConfig(updated);
      notifications.show({ message: 'Configuración guardada', color: 'green' });
    } catch {
      notifications.show({ message: 'Error al guardar', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      setCatError('El nombre de la categoría es obligatorio');
      return;
    }
    setCatError(undefined);
    setSaving(true);
    try {
      if (editCat) {
        const updated = await defaultCategoryApi.update(editCat.id, { name: catForm.name });
        setCategories(prev => prev.map(c => c.id === editCat.id ? updated : c));
      } else {
        const created = await defaultCategoryApi.create({ name: catForm.name, order: categories.length });
        setCategories(prev => [...prev, created]);
      }
      closeCat();
      setCatForm({ name: '' });
      setEditCat(null);
    } catch {
      notifications.show({ message: 'Error al guardar categoría', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    setSaving(true);
    try {
      await defaultCategoryApi.delete(deleteCat.id);
      setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
      closeDeleteCat();
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleSaveTeam = async () => {
    const errors: { name?: string; abbreviation?: string } = {};
    if (!teamForm.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!teamForm.abbreviation.trim()) errors.abbreviation = 'La abreviación es obligatoria';

    if (Object.keys(errors).length > 0) {
      setTeamErrors(errors);
      return;
    }

    setTeamErrors({});
    setSaving(true);
    try {
      if (editTeam) {
        const updated = await globalTeamApi.update(editTeam.id, teamForm);
        setTeams(prev => prev.map(t => t.id === editTeam.id ? updated : t));
      } else {
        const created = await globalTeamApi.create(teamForm);
        setTeams(prev => [...prev, created]);
      }
      closeTeam();
      setTeamForm({ name: '', abbreviation: '', imagePath: '' });
      setEditTeam(null);
    } catch {
      notifications.show({ message: 'Error al guardar equipo', color: 'red' });
    } finally { setSaving(false); }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return;
    setSaving(true);
    try {
      await globalTeamApi.delete(deleteTeam.id);
      setTeams(prev => prev.filter(t => t.id !== deleteTeam.id));
      closeDeleteTeam();
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    } finally { setSaving(false); }
  };

  if (loading) return <Center py="xl"><Loader color="orange" /></Center>;

  return (
    <Box p="md">
      <Title order={2} mb="xs">Configuración del Sistema</Title>
      <Text c="dimmed" size="sm" mb="xl">Ajustes globales de la aplicación</Text>

      <Tabs defaultValue="general">
        <Tabs.List mb="md">
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="categories">Categorías por defecto</Tabs.Tab>
          <Tabs.Tab value="teams">Equipos del sistema</Tabs.Tab>
        </Tabs.List>

        {/* General */}
        <Tabs.Panel value="general">
          <Card withBorder radius="md" p="xl">
            <Stack gap="md">
              <Text fw={500}>Apariencia del panel de administración</Text>
              <TextInput
                label="Título del navbar"
                value={configForm.navbarTitle ?? ''}
                onChange={e => {
                  const val = e.currentTarget.value;
                  setConfigForm(f => ({ ...f, navbarTitle: val }));
                }}
              />
              <ImageUploadInput
                label="Logo del Navbar"
                value={configForm.navbarImagePath}
                onChange={path => setConfigForm(f => ({ ...f, navbarImagePath: path }))}
              />
              <TextInput
                label="Nombre de la pestaña (panel admin)"
                value={configForm.adminTabName ?? ''}
                onChange={e => {
                  const val = e.currentTarget.value;
                  setConfigForm(f => ({ ...f, adminTabName: val }));
                }}
              />
              <ImageUploadInput
                label="Favicon del panel admin"
                value={configForm.adminFaviconPath}
                onChange={path => setConfigForm(f => ({ ...f, adminFaviconPath: path }))}
              />

              <Text fw={500} mt="md">Vista pública del sorteo</Text>
              <TextInput
                label="Título de la página pública"
                value={configForm.publicTitle ?? ''}
                onChange={e => {
                  const val = e.currentTarget.value;
                  setConfigForm(f => ({ ...f, publicTitle: val }));
                }}
              />
              <ImageUploadInput
                label="Banner / Imagen de la vista pública"
                value={configForm.publicImagePath}
                onChange={path => setConfigForm(f => ({ ...f, publicImagePath: path }))}
              />
              <TextInput
                label="Nombre de la pestaña (vista pública)"
                value={configForm.publicTabName ?? ''}
                onChange={e => {
                  const val = e.currentTarget.value;
                  setConfigForm(f => ({ ...f, publicTabName: val }));
                }}
              />
              <ImageUploadInput
                label="Favicon de la vista pública"
                value={configForm.publicFaviconPath}
                onChange={path => setConfigForm(f => ({ ...f, publicFaviconPath: path }))}
              />

              <Text fw={500} mt="md">Sorteos</Text>
              <TextInput
                label='Prefijo de grupo por defecto (Ej: "Grupo")'
                value={configForm.defaultGroupPrefix ?? ''}
                onChange={e => {
                  const val = e.currentTarget.value;
                  setConfigForm(f => ({ ...f, defaultGroupPrefix: val }));
                }}
              />

              <Group justify="flex-end" mt="md">
                <Button color="orange" leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={() => void handleSaveConfig()}>
                  Guardar cambios
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Categories */}
        <Tabs.Panel value="categories">
          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={500}>Categorías por defecto</Text>
                <Text size="sm" c="dimmed">Estas categorías se ofrecen como atajos al configurar deportes en un sorteo.</Text>
              </Box>
              <Button size="sm" leftSection={<IconPlus size={14} />} color="orange"
                onClick={() => { setEditCat(null); setCatForm({ name: '' }); setCatError(undefined); openCat(); }}>
                Agregar
              </Button>
            </Group>

            {categories.length === 0 ? (
              <Text c="dimmed" size="sm">No hay categorías definidas.</Text>
            ) : (
              <Stack gap="xs">
                {categories.map(cat => (
                  <Card key={cat.id} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Text size="sm">{cat.name}</Text>
                      <Group gap={4}>
                        <ActionIcon size="sm" variant="subtle" color="orange"
                          onClick={() => { setEditCat(cat); setCatForm({ name: cat.name }); setCatError(undefined); openCat(); }}>
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon size="sm" variant="subtle" color="red"
                          onClick={() => { setDeleteCat(cat); openDeleteCat(); }}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Global teams */}
        <Tabs.Panel value="teams">
          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={500}>Equipos del sistema</Text>
                <Text size="sm" c="dimmed">Pool de equipos reutilizables que podés importar en cualquier sorteo.</Text>
              </Box>
              <Button size="sm" leftSection={<IconPlus size={14} />} color="orange"
                onClick={() => { setEditTeam(null); setTeamForm({ name: '', abbreviation: '', imagePath: '' }); setTeamErrors({}); openTeam(); }}>
                Agregar
              </Button>
            </Group>

            {teams.length === 0 ? (
              <Text c="dimmed" size="sm">No hay equipos cargados en el sistema.</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {teams.map(team => (
                  <Card key={team.id} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar src={getImageUrl(team.imagePath)} radius="xl" size="sm" alt={team.name} />
                        <Box>
                          <Text fw={500} size="sm">{team.name}</Text>
                          <Text size="xs" c="dimmed">{team.abbreviation}</Text>
                        </Box>
                      </Group>
                      <Group gap={4}>
                        <ActionIcon size="sm" variant="subtle" color="orange"
                          onClick={() => { setEditTeam(team); setTeamForm({ name: team.name, abbreviation: team.abbreviation, imagePath: team.imagePath || '' }); setTeamErrors({}); openTeam(); }}>
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon size="sm" variant="subtle" color="red"
                          onClick={() => { setDeleteTeam(team); openDeleteTeam(); }}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Category modals */}
      <Modal opened={catOpened} onClose={closeCat} title={editCat ? 'Editar categoría' : 'Nueva categoría'} centered>
        <Stack>
          <TextInput
            label="Nombre"
            value={catForm.name}
            error={catError}
            onChange={e => {
              const val = e.currentTarget.value;
              setCatForm({ name: val });
              if (val.trim()) setCatError(undefined);
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSaveCat()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeCat}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSaveCat()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteCatOpened} onClose={closeDeleteCat} title="Eliminar categoría" centered>
        <Stack>
          <Text>¿Eliminar la categoría <strong>{deleteCat?.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteCat}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteCat()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Team modals */}
      <Modal opened={teamOpened} onClose={closeTeam} title={editTeam ? 'Editar equipo' : 'Nuevo equipo'} centered>
        <Stack>
          <TextInput
            label="Nombre completo"
            value={teamForm.name}
            error={teamErrors.name}
            onChange={e => {
              const val = e.currentTarget.value;
              setTeamForm(f => ({ ...f, name: val }));
              if (val.trim()) setTeamErrors(prev => ({ ...prev, name: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSaveTeam()}
            autoFocus
          />
          <TextInput
            label="Abreviación"
            value={teamForm.abbreviation}
            error={teamErrors.abbreviation}
            onChange={e => {
              const val = e.currentTarget.value;
              setTeamForm(f => ({ ...f, abbreviation: val }));
              if (val.trim()) setTeamErrors(prev => ({ ...prev, abbreviation: undefined }));
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSaveTeam()}
          />
          <ImageUploadInput
            label="Logo / Escudo del equipo (opcional)"
            value={teamForm.imagePath}
            onChange={path => setTeamForm(f => ({ ...f, imagePath: path || '' }))}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeTeam}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSaveTeam()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteTeamOpened} onClose={closeDeleteTeam} title="Eliminar equipo" centered>
        <Stack>
          <Text>¿Eliminar el equipo <strong>{deleteTeam?.name}</strong> del sistema?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteTeam}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteTeam()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}