import {
  Box, Title, Text, Accordion, Code, Anchor, Group,
  ThemeIcon, List, Card, Alert,
} from '@mantine/core';
import {
  IconBook, IconServer, IconPlus, 
  IconCode, IconShieldCheck 
} from '@tabler/icons-react';
import { ENV } from '@/config/env';

export function FaqsPage() {
  const ssoUrl = ENV.API_BASE_URL;

  return (
    <Box>
      <Title order={2} mb={4}>FAQs</Title>
      <Text c="dimmed" mb="xl" size="sm">
        Guía rápida para admins del sistema.
      </Text>

      <Card withBorder radius="md" p="lg" mb="xl">
        <Group mb="sm">
          <ThemeIcon variant="light" color="orange" radius="md">
            <IconBook size={16} />
          </ThemeIcon>
          <Text fw={600}>Repositorios</Text>
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

      {/* IconPlus, IconCode, IconShieldCheck, IconServer, IconHelp,  */}
      <Box mb = "xl">
        <Title order={3} mb={4}>Pregunta 1</Title>
        <Accordion variant="separated" radius="md">

          {/* Pregunta N° 1.1 */}
          <Accordion.Item value="nuevo-cliente">
            <Accordion.Control icon={<IconPlus size={16} />}>
              Pregunta 1.1
            </Accordion.Control>
            <Accordion.Panel>
              <List size="sm" spacing="xs">
                <List.Item>Andá a la sección <strong>sección</strong> en el menú lateral</List.Item>
                <List.Item>Hacé click en <strong>botón</strong></List.Item>
                <List.Item>
                  Acordate que podés poner code con {' '}
                  <Code>código 1</Code> o <Code>código 2</Code>
                </List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Pregunta 1.2 */}
          <Accordion.Item value="integrar-sso">
            <Accordion.Control icon={<IconCode size={16} />}>
              Pregunta 1.2
            </Accordion.Control>
            <Accordion.Panel>

              <Alert
                icon={<IconShieldCheck size={16} />}
                color="orange"
                mb="md"
                radius="md"
              >
                <Text size="sm">
                  Alerta importante.
                </Text>
              </Alert>

              <Text size="sm" mb="sm">
                Texto normal. Podés completarlo antes de empezar el listado
              </Text>

              <List size="sm" spacing="sm">
                <List.Item>
                  <Text size="sm" fw={500}>1. Abrí el popup de login</Text>
                  <Code block mt={4}>
                    {`window.open(\n  '${ssoUrl}/sso/login' +\n  '?client_id=TU_ID' +\n  '&redirect_uri=TU_URI' +\n  '&state=VALOR_ALEATORIO' +\n  '&theme=dark',   // o theme=light\n  'sso-login',\n  'width=500,height=420'\n)`}
                  </Code>
                </List.Item>
                <List.Item>
                  <Text size="sm" fw={500}>2. Escuchá el postMessage</Text>
                  <Code block mt={4}>
                    {`window.addEventListener('message', (event) => {\n  // Verificá siempre el origen\n  if (event.origin !== '${ssoUrl}') return;\n  const { code, state } = event.data;\n  // Verificá que state coincida con el que generaste\n  // Mandá el code a tu backend\n})`}
                  </Code>
                </List.Item>
              </List>

              <Alert color="blue" mt="md" radius="md">
                <Text size="sm" fw={500} mb={4}>Otra alerta, pero no tan urgente.</Text>
                <Text size="sm">Texto a recordar:</Text>
                <List size="sm" mt={4} spacing={2}>
                  <List.Item>Ítem 1</List.Item>
                  <List.Item>Ítem 2</List.Item>
                  <List.Item>Ítem 3</List.Item>
                  <List.Item>Ítem 4</List.Item>
                  <List.Item>Ítem 5</List.Item>
                </List>
              </Alert>

            </Accordion.Panel>
          </Accordion.Item>

          {/* Pregunta 1.3, etc */}
          <Accordion.Item value="urls-recomendadas">
              <Accordion.Control icon={<IconServer size={16} />}>
                Pregunta 1.3
              </Accordion.Control>
              <Accordion.Panel>
                <List size="sm" spacing="xs">
                  <List.Item>Te recomendamos cargar las siguientes URLs:</List.Item>
                  <List.Item>Localhost backend <Code>http://localhost:3000 </Code> </List.Item>
                  <List.Item>Localhost frontend (dev) <Code>https://localhost:5173</Code> </List.Item>
                  <List.Item>Localhost frontend (build) <Code>http://localhost:4173</Code> </List.Item>
                  <List.Item>URL que vas a usar para el SSO<Code>https://tu.app.com/callback</Code> </List.Item>
                </List>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>
      </Box>

    </Box>
  );
}