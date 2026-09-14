import { useEffect, useState, useRef } from 'react';
import {
  Title, Text, Button, Group, Stack, Card, TextInput,
  Box, Tabs, Loader, Center, ActionIcon, Modal, SimpleGrid,
  Avatar, Accordion, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconTrash, IconEdit, IconDeviceFloppy,
  IconLayoutNavbar, IconWorld, IconTrophy, IconAlertTriangle,
  IconRotate2, IconTool, IconUser, IconUsers,
} from '@tabler/icons-react';
import { systemConfigApi } from '@/api/systemConfigApi';
import { defaultCategoryApi } from '@/api/defaultCategoryApi';
import { globalTeamApi } from '@/api/globalTeamApi';
import { fileUploadApi } from '@/api/fileUploadApi';
import { notifications } from '@mantine/notifications';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { getImageUrl } from '@/utils/imageUrl';
import type { SystemConfig, DefaultCategory, GlobalTeam } from '@/types/api.types';

export function SystemConfigPage() {
  const [, setConfig] = useState<SystemConfig | null>(null);
  const [initialConfigForm, setInitialConfigForm] = useState<Partial<SystemConfig>>({});
  const [configForm, setConfigForm] = useState<Partial<SystemConfig>>({});
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Unsaved changes & Shake modal
  const [discardModalOpened, { open: openDiscardModal, close: closeDiscardModal }] = useDisclosure(false);
  const [triggerShake, setTriggerShake] = useState(false);

  // Tabs Ref
  const tabsListRef = useRef<HTMLDivElement>(null);

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
      setInitialConfigForm(cfg);
      setConfigForm(cfg);
      setCategories(cats);
      setTeams(ts);
    }).finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(configForm) !== JSON.stringify(initialConfigForm);

  // Prevención de recarga de página con cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Centrado de solapas con scroll suave
  const handleTabChange = (value: string | null) => {
    if (!value || !tabsListRef.current) return;
    const container = tabsListRef.current;
    const activeTab = container.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
    if (!activeTab) return;

    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const padding = 16;

    if (tabRect.left < containerRect.left) {
      container.scrollBy({
        left: tabRect.left - containerRect.left - padding,
        behavior: 'smooth',
      });
    } else if (tabRect.right > containerRect.right) {
      container.scrollBy({
        left: tabRect.right - containerRect.right + padding,
        behavior: 'smooth',
      });
    }
  };

  const handleImageChange = (key: keyof SystemConfig, path: string | null) => {
    setConfigForm(f => ({ ...f, [key]: path }));
    if (path) {
      setNewlyUploadedImages(prev => [...prev, path]);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Excluir id y updatedAt para evitar el error HTTP 400 (forbidNonWhitelisted)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, updatedAt, ...payload } = configForm as SystemConfig;
      const updated = await systemConfigApi.update(payload);
      setConfig(updated);
      setInitialConfigForm(updated);
      setConfigForm(updated);
      setNewlyUploadedImages([]);
      notifications.show({ message: 'Configuración guardada correctamente', color: 'green' });
    } catch {
      notifications.show({ message: 'Error al guardar la configuración', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = async () => {
    // Eliminar imágenes del servidor que se subieron durante esta sesión pero no se guardaron
    for (const path of newlyUploadedImages) {
      if (
        path &&
        path !== initialConfigForm.navbarImagePath &&
        path !== initialConfigForm.adminFaviconPath &&
        path !== initialConfigForm.publicImagePath &&
        path !== initialConfigForm.publicFaviconPath
      ) {
        await fileUploadApi.deleteImage(path);
      }
    }
    setConfigForm({ ...initialConfigForm });
    setNewlyUploadedImages([]);
    closeDiscardModal();
    notifications.show({ message: 'Cambios descartados', color: 'blue' });
  };

  const handleOpenDiscardModal = () => {
    setTriggerShake(true);
    openDiscardModal();
    setTimeout(() => setTriggerShake(false), 500);
  };

  // Handlers para Categorías y Equipos
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
      <style>{`
        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-box {
          animation: shakeAnim 0.4s ease-in-out;
        }
      `}</style>

      <Title order={2} mb="xs">Configuración del Sistema</Title>
      <Text c="dimmed" size="sm" mb="xl">Ajustes globales de la aplicación</Text>

      <Tabs defaultValue="general" variant="outline" radius="md" onChange={handleTabChange}>
        <Tabs.List
          ref={tabsListRef}
          mb="md"
          style={{
            flexWrap: 'nowrap',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Tabs.Tab
            value="general"
            data-value="general"
            leftSection={<IconTool size={14} />}
            style={{ whiteSpace: 'nowrap' }}
          >
            General
          </Tabs.Tab>
          <Tabs.Tab
            value="categories"
            data-value="categories"
            leftSection={<IconUser size={14} />}
            style={{ whiteSpace: 'nowrap' }}
          >
            Categorías por defecto
          </Tabs.Tab>
          <Tabs.Tab
            value="teams"
            data-value="teams"
            leftSection={<IconUsers size={14} />}
            style={{ whiteSpace: 'nowrap' }}
          >
            Equipos del sistema
          </Tabs.Tab>
        </Tabs.List>

        {/* ── General (Cajones / Accordion) ── */}
        <Tabs.Panel value="general">
          <Stack gap="md">
            {isDirty && (
              <Alert icon={<IconAlertTriangle size={16} />} color="orange" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm">Tenés cambios sin guardar en la configuración.</Text>
                  <Group gap="xs">
                    <Button size="xs" variant="subtle" color="red" leftSection={<IconRotate2 size={14} />} onClick={handleOpenDiscardModal}>
                      Descartar
                    </Button>
                    <Button size="xs" color="orange" leftSection={<IconDeviceFloppy size={14} />} loading={saving} onClick={() => void handleSaveConfig()}>
                      Guardar
                    </Button>
                  </Group>
                </Group>
              </Alert>
            )}

            <Accordion variant="separated" radius="md" multiple defaultValue={['admin-panel', 'public-view', 'raffles']}>
              {/* Cajón 1: Panel de Administración */}
              <Accordion.Item value="admin-panel">
                <Accordion.Control icon={<IconLayoutNavbar size={18} />}>
                  <Text fw={600}>Apariencia del panel de administración</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label="Título del navbar"
                      value={configForm.navbarTitle ?? ''}
                      onChange={e => setConfigForm(f => ({ ...f, navbarTitle: e.currentTarget.value }))}
                    />
                    <ImageUploadInput
                      label="Logo del Navbar"
                      value={configForm.navbarImagePath}
                      onChange={path => handleImageChange('navbarImagePath', path)}
                    />
                    <TextInput
                      label="Nombre de la pestaña (panel admin)"
                      value={configForm.adminTabName ?? ''}
                      onChange={e => setConfigForm(f => ({ ...f, adminTabName: e.currentTarget.value }))}
                    />
                    <ImageUploadInput
                      label="Favicon del panel admin"
                      value={configForm.adminFaviconPath}
                      onChange={path => handleImageChange('adminFaviconPath', path)}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Cajón 2: Vista Pública */}
              <Accordion.Item value="public-view">
                <Accordion.Control icon={<IconWorld size={18} />}>
                  <Text fw={600}>Vista pública del sorteo</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label="Título de la página pública"
                      value={configForm.publicTitle ?? ''}
                      onChange={e => setConfigForm(f => ({ ...f, publicTitle: e.currentTarget.value }))}
                    />
                    <ImageUploadInput
                      label="Banner / Imagen de la vista pública"
                      value={configForm.publicImagePath}
                      onChange={path => handleImageChange('publicImagePath', path)}
                    />
                    <TextInput
                      label="Nombre de la pestaña (vista pública)"
                      value={configForm.publicTabName ?? ''}
                      onChange={e => setConfigForm(f => ({ ...f, publicTabName: e.currentTarget.value }))}
                    />
                    <ImageUploadInput
                      label="Favicon de la vista pública"
                      value={configForm.publicFaviconPath}
                      onChange={path => handleImageChange('publicFaviconPath', path)}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Cajón 3: Sorteos */}
              <Accordion.Item value="raffles">
                <Accordion.Control icon={<IconTrophy size={18} />}>
                  <Text fw={600}>Sorteos</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label='Prefijo de grupo por defecto (Ej: "Grupo")'
                      value={configForm.defaultGroupPrefix ?? ''}
                      onChange={e => setConfigForm(f => ({ ...f, defaultGroupPrefix: e.currentTarget.value }))}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Group justify="flex-end" mt="md">
              {isDirty && (
                <Button variant="subtle" color="red" leftSection={<IconRotate2 size={16} />} onClick={handleOpenDiscardModal}>
                  Descartar cambios
                </Button>
              )}
              <Button color="orange" leftSection={<IconDeviceFloppy size={16} />} loading={saving} disabled={!isDirty} onClick={() => void handleSaveConfig()}>
                Guardar cambios
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* ── Categorías por defecto ── */}
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

        {/* ── Equipos del sistema ── */}
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

      {/* Modal Descartar Cambios (con shake) */}
      <Modal opened={discardModalOpened} onClose={closeDiscardModal} title="Cambios sin guardar" centered>
        <Box className={triggerShake ? 'shake-box' : ''}>
          <Stack gap="md">
            <Text size="sm">
              Tenés modificaciones en la configuración que no han sido guardadas. ¿Querés descartar los cambios y restaurar los valores iniciales?
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeDiscardModal}>Mantener cambios</Button>
              <Button color="red" onClick={() => void handleDiscardChanges()}>
                Descartar cambios
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>

      {/* Category Modals */}
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

      {/* Team Modals */}
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