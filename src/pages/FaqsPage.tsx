import {
  Box, Title, Text, Accordion, Code, Anchor, Group,
  ThemeIcon, List, Card, Alert, Badge,
} from '@mantine/core';
import {
  IconBook, IconServer, IconPlus,
  IconShieldCheck, IconTrophy, IconPlayerPlay,
  IconRefresh, IconSettings, IconLock,
} from '@tabler/icons-react';
import { ENV } from '@/config/env';

export function FaqsPage() {
  const apiBaseUrl = ENV.API_BASE_URL;

  return (
    <Box maw={900} mx="auto">
      <Title order={2} mb={4}>Preguntas Frecuentes (FAQs)</Title>
      <Text c="dimmed" mb="xl" size="sm">
        Guía de uso y referencia rápida para administradores y operadores del sistema de sorteos.
      </Text>

      {/* Tarjeta de Repositorios */}
      <Card withBorder radius="md" p="lg" mb="xl">
        <Group mb="sm">
          <ThemeIcon variant="light" color="orange" radius="md">
            <IconBook size={16} />
          </ThemeIcon>
          <Text fw={600}>Repositorios del Proyecto</Text>
        </Group>
        <List spacing="xs" size="sm">
          <List.Item>
            <Text size="sm">
              Back-end:{' '}
              <Anchor
                href="https://github.com/ignamosconi/sorteo-juegos-back"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/ignamosconi/sorteo-juegos-back
              </Anchor>
            </Text>
          </List.Item>
          <List.Item>
            <Text size="sm">
              Front-end:{' '}
              <Anchor
                href="https://github.com/ignamosconi/sorteo-juegos-front"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/ignamosconi/sorteo-juegos-front
              </Anchor>
            </Text>
          </List.Item>
        </List>
      </Card>

      {/* Sección 1: Sorteos y Configuración */}
      <Box mb="xl">
        <Title order={3} mb="md">1. Gestión de Sorteos y Torneos</Title>
        <Accordion variant="separated" radius="md">
          
          <Accordion.Item value="crear-sorteo">
            <Accordion.Control icon={<IconPlus size={16} />}>
              ¿Cómo creo y configuro un nuevo sorteo?
            </Accordion.Control>
            <Accordion.Panel>
              <List size="sm" spacing="xs">
                <List.Item>Ingresá al menú <strong>Sorteos</strong> en la barra lateral.</List.Item>
                <List.Item>Hacé click en el botón <strong>Nuevo Sorteo</strong> e ingresá el nombre del torneo o evento.</List.Item>
                <List.Item>Agregá los <strong>Deportes</strong> y sus respectivas <strong>Categorías</strong> (si aplica).</List.Item>
                <List.Item>Definí los <strong>Grupos</strong> y la capacidad máxima de vacantes para cada uno.</List.Item>
                <List.Item>Importá los <strong>Equipos Participantes</strong> desde el catálogo de Equipos Globales.</List.Item>
                <List.Item>
                  Cambiá el estado del sorteo a <Badge color="orange" size="xs">En progreso</Badge> para habilitar la sala de sorteo en vivo.
                </List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="ejecutar-sorteo">
            <Accordion.Control icon={<IconPlayerPlay size={16} />}>
              ¿Cómo se ejecuta el sorteo en vivo con el Cilindro 3D?
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" mb="xs">
                La pantalla de sorteo en vivo está optimizada para proyectarse o transmitirse:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>Ingresá al sorteo en progreso y hacé click en <strong>Sortear</strong> (o usá el link directo <Code>/sortear/:drawSlug</Code>).</List.Item>
                <List.Item>Seleccioná el <strong>Deporte</strong> y la <strong>Categoría</strong> que querés sortear.</List.Item>
                <List.Item>Presioná <strong>¡Sortear!</strong> para hacer girar el cilindro 3D y obtener un equipo aleatorio.</List.Item>
                <List.Item>A continuación, girá el cilindro para asignarle un <strong>Grupo</strong> disponible.</List.Item>
              </List>
              <Alert color="orange" mt="sm" radius="md">
                <Text size="xs" fw={500}>
                  Si la categoría seleccionada tiene un solo grupo configurado, el sistema asignará el grupo de forma automática en un solo paso.
                </Text>
              </Alert>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="deshacer-sorteo">
            <Accordion.Control icon={<IconRefresh size={16} />}>
              ¿Qué pasa si me equivoco durante un sorteo en vivo?
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" mb="xs">
                El sistema cuenta con una función de <strong>Deshacer contextual</strong>:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>Ubicado en la pantalla del deporte/categoría donde ocurrió la equivocación, presioná <strong>Deshacer último sorteo</strong>.</List.Item>
                <List.Item>El sistema revertirá únicamente el último equipo sorteado en <strong>esa disciplina específica</strong>, sin afectar el progreso de los demás deportes ya sorteados.</List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>
      </Box>

      {/* Sección 2: Pantalla Pública y Transmisión */}
      <Box mb="xl">
        <Title order={3} mb="md">2. Pantalla Pública de Resultados</Title>
        <Accordion variant="separated" radius="md">

          <Accordion.Item value="pantalla-publica">
            <Accordion.Control icon={<IconTrophy size={16} />}>
              ¿Cómo comparto los resultados del sorteo con el público o la transmisión?
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" mb="xs">
                Cada sorteo genera una URL pública accesible sin necesidad de autenticación:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>La URL pública tiene el formato: <Code>/s/:publicSlug</Code>.</List.Item>
                <List.Item>Podés acceder a ella haciendo click en el ícono del ojo <IconTrophy size={14} style={{ verticalAlign: 'middle' }} /> desde el panel o la sala de sorteo.</List.Item>
                <List.Item>La vista se actualiza de forma automática en tiempo real mediante <strong>Polling cada 5 segundos</strong> y eventos de sincronización instantánea.</List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="personalizacion-marca">
            <Accordion.Control icon={<IconSettings size={16} />}>
              ¿Cómo personalizo el logo, título y favicon de la vista pública?
            </Accordion.Control>
            <Accordion.Panel>
              <List size="sm" spacing="xs">
                <List.Item>Ingresá a la sección <strong>Configuración del Sistema</strong> en el menú lateral.</List.Item>
                <List.Item>Cargá la imagen del <strong>Banner / Logo Institucional</strong> para el encabezado.</List.Item>
                <List.Item>Definí el <strong>Título Público</strong> que se mostrará en el encabezado.</List.Item>
                <List.Item>Subí un <strong>Favicon</strong> personalizado y el nombre de pestaña para los navegadores de los espectadores.</List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>
      </Box>

      {/* Sección 3: Seguridad y Accesos */}
      <Box mb="xl">
        <Title order={3} mb="md">3. Seguridad y Doble Factor (2FA)</Title>
        <Accordion variant="separated" radius="md">

          <Accordion.Item value="configurar-2fa">
            <Accordion.Control icon={<IconLock size={16} />}>
              ¿Cómo configuro mi autenticador 2FA por primera vez?
            </Accordion.Control>
            <Accordion.Panel>
              <Alert
                icon={<IconShieldCheck size={16} />}
                color="orange"
                mb="md"
                radius="md"
              >
                <Text size="sm">
                  La autenticación de doble factor es obligatoria para garantizar la integridad de los sorteos.
                </Text>
              </Alert>

              <List size="sm" spacing="xs">
                <List.Item>En tu primer inicio de sesión, la aplicación te mostrará un <strong>código QR</strong>.</List.Item>
                <List.Item>Escanéalo utilizando <strong>Google Authenticator</strong>, <strong>Authy</strong> o la aplicación TOTP de tu preferencia.</List.Item>
                <List.Item>Ingresá el código de 6 dígitos generado por la aplicación para confirmar la vinculación.</List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="entorno-api">
            <Accordion.Control icon={<IconServer size={16} />}>
              Referencia de Endpoints API
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" mb="xs">
                La URL base configurada actualmente para el backend es: <Code>{apiBaseUrl}</Code>
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>Resultados Públicos: <Code>GET {apiBaseUrl}/public/:publicSlug</Code></List.Item>
                <List.Item>Estado de Sorteo: <Code>GET {apiBaseUrl}/draw/:raffleId/state</Code></List.Item>
                <List.Item>Documentación Swagger: <Code>{apiBaseUrl}/api/docs</Code></List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>
      </Box>

    </Box>
  );
}