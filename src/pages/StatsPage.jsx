import React, { useState, useEffect, useMemo} from 'react';
import axios from 'axios'; // or fetch
import { LineChart } from '@mui/x-charts/LineChart';

function StatsPage() {
  const [temps, setTemps] = useState([]);
  const [light, setLight] = useState([]);
  const [location, setLocation] = useState();
  const [mins, setMins] = useState(20);

  const [locations, setLocations] = useState([]);
  

  //Get all location when opening page.
  useEffect(() => {
    fetch("http://192.168.1.131:3000/locations")
      .then((res) => res.json())
      .then((json) => {
        setLocations(json)
        setLocation(json[0].id)
 
      })
      .catch((err) => console.error("Error loading JSON:", err));
  }, []);

  
useEffect(() => {

  if (!location) return; 

  fetch("http://192.168.1.131:3000/data/temperature?LocationID=" + location, {
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: "Basic " + localStorage.getItem("authToken"),
    },
  })
    .then((res) => res.json())
    .then((json) => {
        console.log(json);
      if (Array.isArray(json)) {
        setTemps(json);
      } else {
        console.error("Expected an array but got:", json);
        setTemps([]); 
      }
    })
    .catch((err) => console.error(err));
}, [location]);


const lessThanMiliAgo = (date, mili) => {
    const anHourAgo = Date.now() - mili;

    return date > anHourAgo;
}

const dataset = useMemo(() => {
  return temps
    .map((t) => {
      const date = new Date(t.created_at).getTime();
      if (!lessThanMiliAgo(date, mins * 60 * 1000)) return null;

      return {
        date,
        temperature: t.temp ? Number(t.temp) : null,
        humidity: t.humidity ? Number(t.humidity) : null,
      };
    })
    .filter((d) => d && d.date != null) 
    .sort((a, b) => a.date - b.date);
}, [temps, mins]);




  return (
    <div style={{width: "100%", display:"flex", justifyContent: "center", alignItems: "center", marginTop: 5}}>
           <div className="header dt-background" style={{minWidth: 700, width: 1000, display: 'flex', flexDirection: 'column'}}>
        <div style={{display: "flex", justifyContent: "space-between", width: "100%"}}>
          <div>
            <label htmlFor='location'>Location</label>
            <select value={location} onChange={(e) => setLocation(Number(e.target.value))}>
                  {locations.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              
            </select>
          </div>
          <div>
             Last:
            <input type='number' style={{width: 75}} value={mins} onChange={(e) => setMins(e.target.value)}/>
            min
          </div>
         
        </div>
      
      
      <LineChart
     sx={{
            '.MuiChartsAxis-tickLabel': { fill: 'white' }, // white axis labels
            '.MuiChartsAxis-line': { stroke: '#fff' },    // white axis lines
            '.MuiChartsLegend-series text': { fill: '#fff' },
        }}
        dataset={dataset}
        xAxis={[
          {
            dataKey: 'date',            // field name in dataset for X
            scaleType: 'time',
             valueFormatter: (ms) =>
              new Date(ms).toLocaleTimeString('da-DK', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }), // format tick
          },
        ]}
      series={[
          {
            dataKey: 'temperature',
            label: 'Temperature (°C)',
            color: "#892be28c",
            valueFormatter: (v) => (v == null ? '' : v.toFixed(2)),
          },
          {
            dataKey: 'humidity', 
            label: 'Humidity (%)',
            color: "#2b99e28c",
            valueFormatter: (v) => (v == null ? '' : v.toFixed(2)),
          },
        ]}

        height={300}
        width={950}
      />
      </div>
     
   
    </div>

  );
}

export default StatsPage;
