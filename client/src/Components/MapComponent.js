import React, {useState, useEffect, useRef} from 'react';
import getAllBusses from './firebase';
import Legend from './Legend';
import GoogleMap from 'google-maps-react-markers';
import {Box} from '@mui/material';
import MapMarker from './MapMarker';

export default function MapComponent({center, zoom}) {
  const currentFreeColor = useRef(1);
  const busColors = useRef({});
  const [legendItems, setLegendItems] = useState({});

  // Stores the buses in a state variable to rerender
  const [buses, setBuses] = useState({});

  function headingBetweenPoints({lat1, lon1}, {lat2, lon2}) {
    const R = 6371; // radius of the earth in km

    const toRad = (deg) => (deg * Math.PI) / 180; // convert degrees to radians

    // Y variable
    const dLong = toRad(lon2 - lon1);
    const Y = Math.sin(dLong) * Math.cos(toRad(lat2));

    // X variable
    const X =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLong);

    // Calculate bearing
    const bearing = (toRad(360) + Math.atan2(Y, X)) % toRad(360);
    // convert to degrees
    return (bearing * 180) / Math.PI;
  }

  useEffect(() => {
    // Initial load of markers
    getAllBusses().then((busses) => {
      // Sort buses based on route
      busses.sort((a, b) => {
        if (a.route < b.route) {
          return -1;
        }
        if (a.route > b.route) {
          return 1;
        }
        return 0;
      });
      busses.forEach((bus) => {
        // Used to define new colors/icons for routes
        // Set color for route if it doesnt exist
        if (busColors.current[bus.route] === undefined) {
          // Set marker to next free color
          busColors.current = {
            ...busColors.current,
            [bus.route]: currentFreeColor.current,
          };
          currentFreeColor.current = currentFreeColor.current + 1;
          // Increment the value of currentFreeColor.current by 1
        }
      });

      // Set legend items
      const temp = Object.keys(busColors.current).map((route) => ({
        name: route,
        icon: `${busColors.current[route]}.ico`,
      }));

      setLegendItems(temp);
      setBuses(busses);
    });
  }, [center, zoom]);

  // Update positions of markers every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getAllBusses().then((busses) => {
        busses.forEach((bus) => {
          // Set color for route if it doesnt exist
          if (!buses[bus.id]) {
            if (busColors.current[bus.route] === undefined) {
              busColors.current = {
                ...busColors.current,
                [bus.route]: currentFreeColor.current,
              };
              // Increment the value of currentFreeColor.current by 1
              currentFreeColor.current = currentFreeColor.current + 1;

              // Add new color to legend
              setLegendItems(
                Object.keys(busColors.current).map((route) => ({
                  name: route,
                  icon: `${busColors.current[route]}.ico`,
                })),
              );
            }
          }
        });

        setBuses(busses);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [center]);

  return (
    <>
      <Box
        id="map"
        sx={{
          height: window.innerHeight,
          width: '100vw',
        }}
      >
        <GoogleMap
          apiKey={process.env.REACT_APP_GOOGLE_MAP_KEY}
          defaultCenter={center}
          defaultZoom={zoom}
          onGoogleApiLoaded={() => {}}
        >
          {Object.keys(buses).map((key) => {
            const bus = buses[key];
            const currLocation = {
              lat1: bus.lastLatitude,
              lon1: bus.lastLongitude,
            };
            const previousLocation = {
              lat2: bus.previousLatitude
                ? bus.previousLatitude
                : bus.lastLatitude,
              lon2: bus.previousLongitude
                ? bus.previousLongitude
                : bus.lastLongitude,
            };

            const heading = headingBetweenPoints(
              currLocation,
              previousLocation,
            );
            return (
              <MapMarker
                key={key}
                color={busColors.current[bus.route]}
                lat={bus.lastLatitude}
                lng={bus.lastLongitude}
                bus={bus}
                heading={heading}
              />
            );
          })}
        </GoogleMap>
      </Box>
      <Legend legendItems={legendItems} />
    </>
  );
}
