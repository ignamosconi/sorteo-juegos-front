import { useEffect, useState, useRef, useMemo, useContext } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import {
  Title, Text, Button, Group, Stack, Card, TextInput,
  Box, Tabs, Loader, Center, ActionIcon, Modal, SimpleGrid,
  Avatar, Accordion, Select, Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconTrash, IconEdit, IconDeviceFloppy, IconShield,
  IconLayoutNavbar, IconWorld, IconTrophy, IconAlertTriangle,
  IconRotate2, IconTool, IconUser, IconUsers, IconRun,
} from '@tabler/icons-react';
import { systemConfigApi } from '@/api/systemConfigApi';
import { defaultCategoryApi } from '@/api/defaultCategoryApi';
import { defaultSportApi } from '@/api/defaultSportApi';
import { globalTeamApi } from '@/api/globalTeamApi';
import { fileUploadApi } from '@/api/fileUploadApi';
import { notifications } from '@mantine/notifications';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { getImageUrl } from '@/utils/imageUrl';
import type { SystemConfig, DefaultCategory, DefaultSport, GlobalTeam } from '@/types/api.types';

const ACCORDION_STORAGE_KEY = 'system-config-accordion-state';

export function SystemConfigPage() {
  const [, setConfig] = useState<SystemConfig | null>(null);
  const [initialConfigForm, setInitialConfigForm] = useState<Partial<SystemConfig>>({});
  const [configForm, setConfigForm] = useState<Partial<SystemConfig>>({});
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [accordionState, setAccordionState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ACCORDION_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [discardModalOpened, { open: openDiscardModal, close: closeDiscardModal }] = useDisclosure(false);
  const [triggerShake, setTriggerShake] = useState(false);

  const { navigator } = useContext(NavigationContext);
  const [pendingTx, setPendingTx] = useState<(() => void) | null>(null);

  const tabsListRef = useRef<HTMLDivElement>(null);
  const addSportBtnRef = useRef<HTMLButtonElement>(null);
  const addCatBtnRef = useRef<HTMLButtonElement>(null);
  const addTeamBtnRef = useRef<HTMLButtonElement>(null);

  const [categories, setCategories] = useState<DefaultCategory[]>([]);
  const [catForm, setCatForm] = useState({ name: '' });
  const [catError, setCatError] = useState<string | undefined>(undefined);
  const [editCat, setEditCat] = useState<DefaultCategory | null>(null);
  const [deleteCat, setDeleteCat] = useState<DefaultCategory | null>(null);
  const [catOpened, { open: openCat, close: closeCat }] = useDisclosure(false);
  const [deleteCatOpened, { open: openDeleteCat, close: closeDeleteCat }] = useDisclosure(false);

  const [sports, setSports] = useState<DefaultSport[]>([]);
  const [sportForm, setSportForm] = useState({ name: '' });
  const [sportError, setSportError] = useState<string | undefined>(undefined);
  const [editSport, setEditSport] = useState<DefaultSport | null>(null);
  const [deleteSport, setDeleteSport] = useState<DefaultSport | null>(null);
  const [sportOpened, { open: openSport, close: closeSport }] = useDisclosure(false);
  const [deleteSportOpened, { open: openDeleteSport, close: closeDeleteSport }] = useDisclosure(false);

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
      defaultSportApi.getAll(),
      globalTeamApi.getAll(),
    ]).then(([cfg, cats, sps, ts]) => {
      setConfig(cfg);
      setInitialConfigForm(cfg);
      setConfigForm(cfg);
      setCategories(cats);
      setSports(sps);
      setTeams(ts);
    }).finally(() => setLoading(false));
  }, []);

  const formErrors = useMemo(() => {
    const errors: {
      navbarTitle?: string;
      adminTabName?: string;
      publicTabName?: string;
      defaultGroupPrefix?: string;
    } = {};

    if (configForm.navbarTitle !== undefined) {
      const trimmed = configForm.navbarTitle.trim();
      if (!trimmed) {
        errors.navbarTitle = 'El título del navbar no puede estar vacío.';
      } else if (trimmed.length > 20) {
        errors.navbarTitle = 'El título no puede superar los 20 caracteres.';
      }
    }

    if (configForm.adminTabName !== undefined) {
      const trimmed = configForm.adminTabName.trim();
      if (!trimmed) {
        errors.adminTabName = 'El nombre de la pestaña no puede estar vacío.';
      } else if (trimmed.length > 25) {
        errors.adminTabName = 'El nombre no puede superar los 25 caracteres.';
      }
    }

    if (configForm.publicTabName !== undefined) {
      const trimmed = configForm.publicTabName.trim();
      if (!trimmed) {
        errors.publicTabName = 'El nombre de la pestaña pública no puede estar vacío.';
      } else if (trimmed.length > 25) {
        errors.publicTabName = 'El nombre no puede superar los 25 caracteres.';
      }
    }

    if (configForm.defaultGroupPrefix !== undefined && !configForm.defaultGroupPrefix.trim()) {
      errors.defaultGroupPrefix = 'El prefijo de grupo no puede estar vacío.';
    }

    return errors;
  }, [configForm]);

  const hasFormErrors = Object.keys(formErrors).length > 0;
  const isDirty = JSON.stringify(configForm) !== JSON.stringify(initialConfigForm);

  useEffect(() => {
    if (!isDirty) return;

    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    navigator.push = (to: any, state?: any, opts?: any) => {
      setPendingTx(() => () => originalPush(to, state, opts));
      setTriggerShake(true);
      openDiscardModal();
      setTimeout(() => setTriggerShake(false), 500);
    };

    navigator.replace = (to: any, state?: any, opts?: any) => {
      setPendingTx(() => () => originalReplace(to, state, opts));
      setTriggerShake(true);
      openDiscardModal();
      setTimeout(() => setTriggerShake(false), 500);
    };

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [navigator, isDirty, openDiscardModal]);

  const handleAccordionChange = (state: string[]) => {
    setAccordionState(state);
    localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
  };

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
    if (hasFormErrors) return;

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, updatedAt, ...payload } = configForm as SystemConfig;
      const updated = await systemConfigApi.update(payload);
      setConfig(updated);
      setInitialConfigForm(updated);
      setConfigForm(updated);
      setNewlyUploadedImages([]);

      window.dispatchEvent(new CustomEvent('system-config-updated', { detail: updated }));
      notifications.show({ message: 'Configuración guardada correctamente', color: 'green' });
    } catch {
      notifications.show({ message: 'Error al guardar la configuración', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = async () => {
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
    notifications.show({ message: 'Cambios descartados', color: 'blue' });
  };

  const handleModalDiscard = async () => {
    await handleDiscardChanges();
    closeDiscardModal();
    if (pendingTx) {
      pendingTx();
      setPendingTx(null);
    }
  };

  const handleModalKeep = () => {
    closeDiscardModal();
    setPendingTx(null);
  };

  const handleSaveCat = async () => {
    const trimName = catForm.name.trim();
    if (!trimName) {
      setCatError('El nombre de la categoría es obligatorio');
      return;
    }

    const exists = categories.some(
      c => c.id !== editCat?.id && c.name.trim().toLowerCase() === trimName.toLowerCase()
    );
    if (exists) {
      setCatError('Esta categoría ya existe en el sistema');
      return;
    }

    setCatError(undefined);
    setSaving(true);
    try {
      if (editCat) {
        const updated = await defaultCategoryApi.update(editCat.id, { name: trimName });
        setCategories(prev => prev.map(c => c.id === editCat.id ? updated : c));
      } else {
        const created = await defaultCategoryApi.create({ name: trimName, order: categories.length });
        setCategories(prev => [...prev, created]);
      }
      closeCat();
      setCatForm({ name: '' });
      setEditCat(null);
      setTimeout(() => addCatBtnRef.current?.focus(), 100);
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.message?.includes('duplicate')) {
        setCatError('Esta categoría ya existe en el sistema');
      } else {
        notifications.show({ message: 'Error al guardar categoría', color: 'red' });
      }
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

  const handleSaveSport = async () => {
    const trimName = sportForm.name.trim();
    if (!trimName) {
      setSportError('El nombre del deporte es obligatorio');
      return;
    }

    const exists = sports.some(
      s => s.id !== editSport?.id && s.name.trim().toLowerCase() === trimName.toLowerCase()
    );
    if (exists) {
      setSportError('Este deporte ya existe en el sistema');
      return;
    }

    setSportError(undefined);
    setSaving(true);
    try {
      if (editSport) {
        const updated = await defaultSportApi.update(editSport.id, { name: trimName });
        setSports(prev => prev.map(s => s.id === editSport.id ? updated : s));
      } else {
        const created = await defaultSportApi.create({ name: trimName, order: sports.length });
        setSports(prev => [...prev, created]);
      }
      closeSport();
      setSportForm({ name: '' });
      setEditSport(null);
      setTimeout(() => addSportBtnRef.current?.focus(), 100);
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.message?.includes('duplicate')) {
        setSportError('Este deporte ya existe en el sistema');
      } else {
        notifications.show({ message: 'Error al guardar deporte', color: 'red' });
      }
    } finally { setSaving(false); }
  };

  const handleDeleteSport = async () => {
    if (!deleteSport) return;
    setSaving(true);
    try {
      await defaultSportApi.delete(deleteSport.id);
      setSports(prev => prev.filter(s => s.id !== deleteSport.id));
      closeDeleteSport();
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
      setTimeout(() => addTeamBtnRef.current?.focus(), 100);
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
            value="sports"
            data-value="sports"
            leftSection={<IconRun size={14} />}
            style={{ whiteSpace: 'nowrap' }}
          >
            Deportes por defecto
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
            <Accordion
              variant="separated"
              radius="md"
              multiple
              value={accordionState}
              onChange={handleAccordionChange}
            >
              <Accordion.Item value="admin-panel">
                <Accordion.Control icon={<IconLayoutNavbar size={18} />}>
                  <Text fw={600}>Apariencia del panel de administración</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label="Título del navbar"
                      description="Máximo 20 caracteres."
                      placeholder="FRVM Sorteos"
                      value={configForm.navbarTitle ?? ''}
                      error={formErrors.navbarTitle}
                      maxLength={20}
                      onChange={e => {
                        const val = e.target.value;
                        setConfigForm(f => ({ ...f, navbarTitle: val }));
                      }}
                      required
                    />
                    <ImageUploadInput
                      label="Logo del Navbar"
                      value={configForm.navbarImagePath}
                      onChange={path => handleImageChange('navbarImagePath', path)}
                    />
                    <TextInput
                      label="Nombre de la pestaña (panel admin)"
                      description="Máximo 25 caracteres."
                      placeholder="SSO FRVM - Admin"
                      value={configForm.adminTabName ?? ''}
                      error={formErrors.adminTabName}
                      maxLength={25}
                      onChange={e => {
                        const val = e.target.value;
                        setConfigForm(f => ({ ...f, adminTabName: val }));
                      }}
                      required
                    />
                    <ImageUploadInput
                      label="Favicon del panel admin"
                      value={configForm.adminFaviconPath}
                      onChange={path => handleImageChange('adminFaviconPath', path)}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="public-view">
                <Accordion.Control icon={<IconWorld size={18} />}>
                  <Text fw={600}>Vista pública del sorteo</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label="Título de la página pública"
                      value={configForm.publicTitle ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfigForm(f => ({ ...f, publicTitle: val }));
                      }}
                    />
                    <ImageUploadInput
                      label="Banner / Imagen de la vista pública"
                      value={configForm.publicImagePath}
                      onChange={path => handleImageChange('publicImagePath', path)}
                    />
                    <TextInput
                      label="Nombre de la pestaña (vista pública)"
                      description="Máximo 25 caracteres."
                      placeholder="Resultados Sorteo"
                      value={configForm.publicTabName ?? ''}
                      error={formErrors.publicTabName}
                      maxLength={25}
                      onChange={e => {
                        const val = e.target.value;
                        setConfigForm(f => ({ ...f, publicTabName: val }));
                      }}
                      required
                    />
                    <ImageUploadInput
                      label="Favicon de la vista pública"
                      value={configForm.publicFaviconPath}
                      onChange={path => handleImageChange('publicFaviconPath', path)}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="raffles">
                <Accordion.Control icon={<IconTrophy size={18} />}>
                  <Text fw={600}>Sorteos</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" pt="xs">
                    <TextInput
                      label='Prefijo de grupo por defecto (Ej: "Grupo", "Zona")'
                      value={configForm.defaultGroupPrefix ?? ''}
                      error={formErrors.defaultGroupPrefix}
                      onChange={e => {
                        const val = e.target.value;
                        setConfigForm(f => ({ ...f, defaultGroupPrefix: val }));
                      }}
                      required
                    />
                    <Select
                      label="Secuencia / Formato del sufijo de grupo"
                      placeholder="Seleccioná una secuencia..."
                      data={[
                        { value: 'ALPHA_UPPER', label: 'Letras mayúsculas (A, B, C...)' },
                        { value: 'NUMERIC', label: 'Números (1, 2, 3...)' },
                        { value: 'ALPHA_LOWER', label: 'Letras minúsculas (a, b, c...)' },
                        { value: 'ROMAN', label: 'Números romanos (I, II, III...)' },
                      ]}
                      value={configForm.defaultGroupSequence ?? 'ALPHA_UPPER'}
                      onChange={val => setConfigForm(f => ({ ...f, defaultGroupSequence: val || 'ALPHA_UPPER' }))}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Group justify="space-between" align="center" mt="md">
              <Box>
                {isDirty && (
                  <Group gap="xs" c="orange">
                    <IconAlertTriangle size={18} />
                    <Text size="sm" fw={500}>Tenés cambios sin guardar en la configuración.</Text>
                  </Group>
                )}
              </Box>

              <Group gap="xs">
                {isDirty && (
                  <Button variant="subtle" color="red" leftSection={<IconRotate2 size={16} />} onClick={() => void handleDiscardChanges()}>
                    Descartar cambios
                  </Button>
                )}
                <Button
                  color="orange"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={saving}
                  disabled={!isDirty || hasFormErrors}
                  onClick={() => void handleSaveConfig()}
                >
                  Guardar cambios
                </Button>
              </Group>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* ── Deportes por defecto ── */}
        <Tabs.Panel value="sports">
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Deportes por defecto</Text>
                  <Text size="sm" c="dimmed">Estos deportes se ofrecen como atajos al configurar los deportes de un sorteo.</Text>
                </Box>
                <Button
                  ref={addSportBtnRef}
                  size="sm"
                  leftSection={<IconPlus size={14} />}
                  color="orange"
                  onClick={() => { setEditSport(null); setSportForm({ name: '' }); setSportError(undefined); openSport(); }}
                >
                  Agregar
                </Button>
              </Group>
            </Paper>

            {sports.length === 0 ? (
              <Text c="dimmed" size="sm">No hay deportes definidos en el sistema.</Text>
            ) : (
              <Stack gap="xs">
                {sports.map(sport => (
                  <Card key={sport.id} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Text size="sm">{sport.name}</Text>
                      <Group gap={4}>
                        <ActionIcon size="sm" variant="subtle" color="orange"
                          onClick={() => { setEditSport(sport); setSportForm({ name: sport.name }); setSportError(undefined); openSport(); }}>
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon size="sm" variant="subtle" color="red"
                          onClick={() => { setDeleteSport(sport); openDeleteSport(); }}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        {/* ── Categorías por defecto ── */}
        <Tabs.Panel value="categories">
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Categorías por defecto</Text>
                  <Text size="sm" c="dimmed">Estas categorías se ofrecen como atajos al configurar deportes en un sorteo.</Text>
                </Box>
                <Button
                  ref={addCatBtnRef}
                  size="sm"
                  leftSection={<IconPlus size={14} />}
                  color="orange"
                  onClick={() => { setEditCat(null); setCatForm({ name: '' }); setCatError(undefined); openCat(); }}
                >
                  Agregar
                </Button>
              </Group>
            </Paper>

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
          </Stack>
        </Tabs.Panel>

        {/* ── Equipos del sistema ── */}
        <Tabs.Panel value="teams">
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Equipos del sistema</Text>
                  <Text size="sm" c="dimmed">Pool de equipos reutilizables que podés importar en cualquier sorteo.</Text>
                </Box>
                <Button
                  ref={addTeamBtnRef}
                  size="sm"
                  leftSection={<IconPlus size={14} />}
                  color="orange"
                  onClick={() => { setEditTeam(null); setTeamForm({ name: '', abbreviation: '', imagePath: '' }); setTeamErrors({}); openTeam(); }}
                >
                  Agregar
                </Button>
              </Group>
            </Paper>

            {teams.length === 0 ? (
              <Text c="dimmed" size="sm">No hay equipos cargados en el sistema.</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {teams.map(team => (
                  <Card key={team.id} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar
                          src={getImageUrl(team.imagePath)}
                          radius="xl"
                          size="sm"
                          alt={team.name}
                          styles={{
                            image: {
                              objectFit: 'contain',
                              padding: '2px',
                            },
                          }}
                        >
                          <IconShield size={14} />
                        </Avatar>
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
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal Descartar Cambios */}
      <Modal opened={discardModalOpened} onClose={handleModalKeep} title="Cambios sin guardar" centered>
        <Box className={triggerShake ? 'shake-box' : ''}>
          <Stack gap="md">
            <Text size="sm">
              Tenés modificaciones en la configuración sin guardar. Si salís de esta página vas a perder los cambios. ¿Querés descartar los cambios o mantenerte acá?
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleModalKeep}>
                Quedarse
              </Button>
              <Button color="red" onClick={() => void handleModalDiscard()}>
                Descartar cambios y salir
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>

      {/* Default Sport Modals */}
      <Modal
        opened={sportOpened}
        onClose={() => { closeSport(); setTimeout(() => addSportBtnRef.current?.focus(), 100); }}
        title={editSport ? 'Editar deporte' : 'Nuevo deporte'}
        centered
      >
        <Stack>
          <TextInput
            label="Nombre del deporte"
            value={sportForm.name}
            error={sportError}
            placeholder="Ej: Fútbol"
            onChange={e => {
              const val = e.target.value;
              setSportForm({ name: val });
              if (val.trim()) setSportError(undefined);
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSaveSport()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeSport(); setTimeout(() => addSportBtnRef.current?.focus(), 100); }}>Cancelar</Button>
            <Button color="orange" loading={saving} onClick={() => void handleSaveSport()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteSportOpened} onClose={closeDeleteSport} title="Eliminar deporte" centered>
        <Stack>
          <Text>¿Eliminar el deporte <strong>{deleteSport?.name}</strong> del sistema?</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteSport}>Cancelar</Button>
            <Button color="red" loading={saving} onClick={() => void handleDeleteSport()}>Eliminar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Category Modals */}
      <Modal
        opened={catOpened}
        onClose={() => { closeCat(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }}
        title={editCat ? 'Editar categoría' : 'Nueva categoría'}
        centered
      >
        <Stack>
          <TextInput
            label="Nombre"
            value={catForm.name}
            error={catError}
            onChange={e => {
              const val = e.target.value;
              setCatForm({ name: val });
              if (val.trim()) setCatError(undefined);
            }}
            onKeyDown={e => e.key === 'Enter' && void handleSaveCat()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeCat(); setTimeout(() => addCatBtnRef.current?.focus(), 100); }}>Cancelar</Button>
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
      <Modal
        opened={teamOpened}
        onClose={() => { closeTeam(); setTimeout(() => addTeamBtnRef.current?.focus(), 100); }}
        title={editTeam ? 'Editar equipo' : 'Nuevo equipo'}
        centered
      >
        <Stack>
          <TextInput
            label="Nombre completo"
            value={teamForm.name}
            error={teamErrors.name}
            placeholder="Facultad Regional Villa María"
            onChange={e => {
              const val = e.target.value;
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
            placeholder="FRVM"
            onChange={e => {
              const val = e.target.value;
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
            <Button variant="subtle" onClick={() => { closeTeam(); setTimeout(() => addTeamBtnRef.current?.focus(), 100); }}>Cancelar</Button>
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