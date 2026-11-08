# Davis Client

## Data From Davis API

| Output Field | Output Unit | Sensor Data Name | Fetched Unit |
| ------------ | ----------- | ---------------- | ------------ |
| rainRateInHr | in/hr | Rain Rate | in/hr |
| windMph | mph | Wind Speed | mph |
| windDir | cardinal | Wind Direction | degrees |
| gustMph | mph | 10 Min High Wind Speed | mph |
| solarRadWm2 | W/m^2 | Solar Rad | W/m^2 |
| tempF | Fahrenheit | Temp | Fahrenheit |
| tempC | Celsius | Temp | Fahrenheit |
| humidityPct | Percent | Hum | Percent |
| dewPointF | Fahrenheit | Dew Point | Fahrenheit |
| windChillF | Fahrenheit | Wind Chill | Fahrenheit |
| pressure | in Hg | Barometer | in Hg |
| observedAt | Unix Epoch, milliseconds | lastRecieved | Unix Epoch, milliseconds |
| fetchedAt | Unix Epoch, milliseconds |  |  |

## Functions

`fetchWeatherlinkData()`:
- Fetch Weatherlink Data from [Davis API](https://www.weatherlink.com/embeddablePage/summaryData/58237ce672554bc5b0009b67644756f3)
- Add `fetchedAt` value to JSON with the value `now`
- Returns full raw json
 
`normalizeWeatherlinkData(raw)`
- Returns dictionary with `fetchedAt`, `lastRecieved` and all output fields defined above `{measurement:value}`