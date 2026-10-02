import { useState } from 'react';
import { useSelector } from 'react-redux';

import {
  Typography,
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsyncTask } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PositionValue from '../common/components/PositionValue';
import AddressValue from '../common/components/AddressValue';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAttributePreference } from '../common/util/preferences';
import {
  formatTime,
  formatSpeed,
  formatDistance,
  formatAltitude,
  formatNumericHours,
} from '../common/util/formatter';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    overflow: 'auto',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  section: {
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.action.hover,
    fontWeight: 600,
  },
  label: {
    color: theme.palette.text.secondary,
    width: '45%',
  },
  value: {
    fontWeight: 500,
  },
  empty: {
    color: theme.palette.text.disabled,
  },
  headerChip: {
    marginLeft: theme.spacing(2),
    fontWeight: 600,
  },
  technical: {
    marginBottom: theme.spacing(2),
  },
}));

// Actividad del conductor (io184, Driver 1 Working State del tacografo).
// Mismo criterio que los marcadores del mapa en MapPositions.js.
const activities = {
  0: { label: 'Descansando', color: 'success' },
  1: { label: 'Disponible', color: 'success' },
  2: { label: 'Trabajando', color: 'warning' },
  3: { label: 'Conduciendo', color: 'primary' },
};

const readActivity = (attributes) => {
  const state = attributes?.io184;
  if (state === undefined || state === null || state === '') {
    return null;
  }
  return activities[Number(state)] ?? null;
};

// Atributos que ya se muestran con nombre claro en las secciones de arriba.
// El resto cae en "Datos tecnicos" para no perder informacion.
const curatedKeys = [
  'io184',
  'io24',
  'ignition',
  'totalDistance',
  'hours',
  'distance',
  'power',
  'battery',
  'sat',
  'hdop',
  'rssi',
];

// hdop: cuanto mas bajo, mejor la precision del GPS.
const gpsAccuracy = (hdop) => {
  const value = Number(hdop);
  if (value <= 1) return 'Muy buena';
  if (value <= 2) return 'Buena';
  if (value <= 5) return 'Regular';
  return 'Mala';
};

const Row = ({ label, children }) => {
  const { classes } = useStyles();
  return (
    <TableRow>
      <TableCell className={classes.label}>{label}</TableCell>
      <TableCell className={classes.value}>{children}</TableCell>
    </TableRow>
  );
};

const Section = ({ title, children }) => {
  const { classes } = useStyles();
  return (
    <Paper className={classes.section}>
      <Typography variant="body2" className={classes.sectionTitle}>
        {title}
      </Typography>
      <Divider />
      <Table size="small">
        <TableBody>{children}</TableBody>
      </Table>
    </Paper>
  );
};

const PositionPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const positionAttributes = usePositionAttributes(t);

  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const speedUnit = useAttributePreference('speedUnit');

  const { id } = useParams();

  const [item, setItem] = useState();

  useAsyncTask(
    async ({ signal }) => {
      if (id) {
        const response = await fetchOrThrow(`/api/positions?id=${id}`, { signal });
        const positions = await response.json();
        if (positions.length > 0) {
          setItem(positions[0]);
        }
      }
    },
    [id],
  );

  const deviceName = useSelector((state) => {
    if (item) {
      const device = state.devices.items[item.deviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  const attributes = item?.attributes ?? {};
  const activity = readActivity(attributes);

  // Marca un valor ausente en gris en vez de dejar la fila vacia.
  const orEmpty = (value, formatted) =>
    value === undefined || value === null || value === '' ? (
      <span className={classes.empty}>Sin datos</span>
    ) : (
      formatted
    );

  const technicalKeys = Object.keys(attributes)
    .filter((key) => !curatedKeys.includes(key))
    .sort();

  return (
    <div className={classes.root}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6">{deviceName}</Typography>
          {activity && (
            <Chip
              size="small"
              label={activity.label}
              color={activity.color}
              className={classes.headerChip}
            />
          )}
        </Toolbar>
      </AppBar>
      <div className={classes.content}>
        <Container maxWidth="sm">
          {item && (
            <>
              <Section title="Estado del camión">
                <Row label="Actividad del conductor">
                  {activity ? (
                    activity.label
                  ) : (
                    <span className={classes.empty}>Sin tacógrafo o sin tarjeta</span>
                  )}
                </Row>
                <Row label="Velocidad">
                  {orEmpty(item.speed, formatSpeed(item.speed, speedUnit, t))}
                </Row>
                {/* Se deduce de la velocidad GPS. Ni motion ni io187 sirven: ambos
                    marcan movimiento con el camion parado. */}
                <Row label="¿Está circulando?">
                  {item.speed > 0 ? 'Sí, en marcha' : 'No, está parado'}
                </Row>
                <Row label="Contacto">
                  {orEmpty(attributes.ignition, attributes.ignition ? 'Puesto' : 'Quitado')}
                </Row>
              </Section>

              <Section title="Dónde está">
                <Row label="Dirección">
                  <AddressValue
                    latitude={item.latitude}
                    longitude={item.longitude}
                    originalAddress={item.address}
                  />
                </Row>
                <Row label="Última señal">{formatTime(item.fixTime, 'seconds')}</Row>
                <Row label="Coordenadas">
                  {`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                </Row>
                <Row label="Altitud">
                  {orEmpty(item.altitude, formatAltitude(item.altitude, altitudeUnit, t))}
                </Row>
              </Section>

              <Section title="Uso del vehículo">
                <Row label="Kilómetros totales">
                  {orEmpty(
                    attributes.totalDistance,
                    formatDistance(attributes.totalDistance, distanceUnit, t),
                  )}
                </Row>
                <Row label="Horas de motor">
                  {orEmpty(attributes.hours, formatNumericHours(attributes.hours, t))}
                </Row>
                <Row label="Recorrido desde la señal anterior">
                  {orEmpty(
                    attributes.distance,
                    formatDistance(attributes.distance, distanceUnit, t),
                  )}
                </Row>
              </Section>

              <Section title="Equipo y cobertura">
                <Row label="Voltaje del camión">
                  {orEmpty(attributes.power, `${Number(attributes.power).toFixed(1)} V`)}
                </Row>
                <Row label="Batería del GPS">
                  {orEmpty(attributes.battery, `${Number(attributes.battery).toFixed(2)} V`)}
                </Row>
                <Row label="Satélites conectados">{orEmpty(attributes.sat, attributes.sat)}</Row>
                <Row label="Precisión del GPS">
                  {orEmpty(attributes.hdop, gpsAccuracy(attributes.hdop))}
                </Row>
                <Row label="Cobertura móvil">
                  {orEmpty(attributes.rssi, `${attributes.rssi} de 5`)}
                </Row>
              </Section>

              {technicalKeys.length > 0 && (
                <Accordion className={classes.technical}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">
                      {`Datos técnicos (${technicalKeys.length})`}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Table size="small">
                      <TableBody>
                        {technicalKeys.map((attribute) => (
                          <TableRow key={attribute}>
                            <TableCell className={classes.label}>
                              {positionAttributes[attribute]?.name || attribute}
                            </TableCell>
                            <TableCell>
                              <PositionValue position={item} attribute={attribute} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}
        </Container>
      </div>
    </div>
  );
};

export default PositionPage;
