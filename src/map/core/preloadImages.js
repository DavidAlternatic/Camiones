import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon } from './mapUtil';
import directionSvg from '../../resources/images/direction.svg';
import arrowSvg from '../../resources/images/arrow.svg';
import squareSvg from '../../resources/images/square.svg';
import arrowBackgroundSvg from '../../resources/images/arrow-background.svg';
import backgroundSvg from '../../resources/images/background.svg';
import animalSvg from '../../resources/images/icon/animal.svg';
import bicycleSvg from '../../resources/images/icon/bicycle.svg';
import boatSvg from '../../resources/images/icon/boat.svg';
import busSvg from '../../resources/images/icon/bus.svg';
import carSvg from '../../resources/images/icon/car.svg';
import camperSvg from '../../resources/images/icon/camper.svg';
import craneSvg from '../../resources/images/icon/crane.svg';
import defaultSvg from '../../resources/images/icon/default.svg';
import startSvg from '../../resources/images/icon/start.svg';
import finishSvg from '../../resources/images/icon/finish.svg';
import helicopterSvg from '../../resources/images/icon/helicopter.svg';
import motorcycleSvg from '../../resources/images/icon/motorcycle.svg';
import personSvg from '../../resources/images/icon/person.svg';
import planeSvg from '../../resources/images/icon/plane.svg';
import scooterSvg from '../../resources/images/icon/scooter.svg';
import shipSvg from '../../resources/images/icon/ship.svg';
import tractorSvg from '../../resources/images/icon/tractor.svg';
import trailerSvg from '../../resources/images/icon/trailer.svg';
import trainSvg from '../../resources/images/icon/train.svg';
import tramSvg from '../../resources/images/icon/tram.svg';
import truckSvg from '../../resources/images/icon/truck.svg';
import vanSvg from '../../resources/images/icon/van.svg';
export const mapIcons = {
  animal: animalSvg,
  bicycle: bicycleSvg,
  boat: boatSvg,
  bus: busSvg,
  car: carSvg,
  camper: camperSvg,
  crane: craneSvg,
  default: defaultSvg,
  finish: finishSvg,
  helicopter: helicopterSvg,
  motorcycle: motorcycleSvg,
  person: personSvg,
  plane: planeSvg,
  scooter: scooterSvg,
  ship: shipSvg,
  start: startSvg,
  tractor: tractorSvg,
  trailer: trailerSvg,
  train: trainSvg,
  tram: tramSvg,
  truck: truckSvg,
  van: vanSvg,
};
export const mapIconKey = (category) => {
  switch (category) {
    case 'offroad':
    case 'pickup':
      return 'car';
    case 'trolleybus':
      return 'bus';
    default:
      return mapIcons.hasOwnProperty(category) ? category : 'default';
  }
};
export const mapImages = {};
const theme = createTheme({
  palette: {
    neutral: { main: grey[500] },
    success: { main: '#2e7d32' }, // verde    -> en movimiento (iconos de categoria)
    driving: { main: '#1565c0' }, // azul     -> conduciendo      (io184=3)
    working: { main: '#fb8c00' }, // naranja  -> trabajando       (io184=2)
    resting: { main: '#2e7d32' }, // verde    -> descansando/disponible (io184=0/1)
    warning: { main: '#f9a825' }, // amarillo -> parado con contacto
    error: { main: '#c62828' }, // rojo     -> apagado
  },
});
export default async () => {
  const background = await loadImage(backgroundSvg);
  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIcon(await loadImage(directionSvg));
  // Marcadores de estado: flecha (conduciendo) o cuadrado (parado/trabajando)
  // sobre el mismo circulo blanco. El fondo NO se tine, solo la forma interior.
  const markerBackground = await loadImage(arrowBackgroundSvg);
  const markerShapes = {
    arrow: { icon: await loadImage(arrowSvg), ratio: 0.82 },
    square: { icon: await loadImage(squareSvg), ratio: 0.82 },
  };
  Object.entries(markerShapes).forEach(([shape, { icon, ratio }]) => {
    ['driving', 'working', 'resting', 'warning', 'error', 'neutral'].forEach((color) => {
      mapImages[`marker-${shape}-${color}`] = prepareIcon(
        markerBackground,
        icon,
        theme.palette[color].main,
        ratio,
      );
    });
  });
  await Promise.all(
    Object.keys(mapIcons).map(async (category) => {
      const results = [];
      ['info', 'success', 'error', 'warning', 'neutral'].forEach((color) => {
        results.push(
          loadImage(mapIcons[category]).then((icon) => {
            mapImages[`${category}-${color}`] = prepareIcon(
              background,
              icon,
              theme.palette[color].main,
            );
          }),
        );
      });
      await Promise.all(results);
    }),
  );
};
