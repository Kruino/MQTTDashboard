import React, { useState, useEffect, useMemo} from 'react';
import axios from 'axios'; // or fetch
import { LineChart } from '@mui/x-charts/LineChart';

function StatsPage() {
  const [temps, setTemps] = useState([]);
  const [light, setLight] = useState([]);




  
useEffect(() => {
  fetch("http://localhost:3000/data/temperature?LocationID=7", {
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
}, []);


const lessThanMiliAgo = (date, mili) => {
    const HOUR = 1000 * 60 * 60;
    const anHourAgo = Date.now() - HOUR;

    return date > anHourAgo;
}
const dataset = useMemo(() => {
    
    var currentdate = new Date();


    return temps
      .map((t) => {
        var date = new Date(t.date).getTime();
        if (lessThanMiliAgo(date, 600000)){
            return null;
        }
        
        return ({
        date: t.date ? new Date(t.date).getTime() : null,
        temperature:
          t.temperature === null || t.temperature === undefined || t.temperature === ''
            ? null
            : Number(t.temperature),
        humditity:  t.humidity === null || t.humidity === undefined || t.humidity === ''
            ? null
            : Number(t.humidity),
      })})
      .filter((d) => d != null && d.date != null && d.temperature != null)
      .sort((a, b) => a.date - b.date);
  }, [temps]);


  return (
    <div style={{width: "100%", height: "100%", display:"flex", justifyContent: "center", alignItems: "center"}}>
           <div className="header dt-background" style={{minWidth: 700, width: 1000}}>
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
            valueFormatter: (ms) => new Date(ms).toLocaleString(), // format tick
          },
        ]}
        series={[
          {
            dataKey: 'temperature',     // field name in dataset for Y
            label: 'Temperature (°C)',
            color: "#892be28c",
            valueFormatter: (v) => (v == null ? '' : v.toFixed(1)),
          },
            {
            dataKey: 'humditity',     // field name in dataset for Y
            label: 'Humidity (%)',
            color: "#2b99e28c",
            valueFormatter: (v) => (v == null ? '' : v.toFixed(1)),
          },
        ]}
        height={300}
      />
      </div>
     
   
    </div>

  );
}

export default StatsPage;
