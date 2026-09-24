## Application Flow

When the page loads, Souvenir Radio performs several initialization steps before beginning its recurring Now Playing updates.

At a high level, the startup flow is:

````
Page Load 
| 
v 
loadLiveDjShows() 
| 
v initSchedule() 
| +--> loadSchedule() 
| +--> renderUpcomingBroadcasts() 
| 
v refresh() 
| +--> fetchNowPlaying() 
| +--> updateUI() 
| 
v Repeat refresh() every 15 seconds
 ```` 
### loadLiveDjShows()

The first asynchronous method called is:

await loadLiveDjShows();

loadLiveDjShows() fetches data from:

/liveDjs.json

This file contains additional information about the DJs and live shows that can appear on Souvenir Radio.

The returned JSON data is stored in the liveDjShows variable.

This data is loaded whether or not a DJ is currently broadcasting. It remains available in memory so that it can be used later if the application detects a live broadcast.

Conceptually:
````
loadLiveDjShows()
|
v
Fetch liveDjs.json
|
v
Parse JSON
|
v
Store data in liveDjShows
````
Because this method performs a network request, await is used so that the application waits for the request to complete before moving on to the next initialization step.

### initSchedule()

After loadLiveDjShows() finishes, the application calls:

await initSchedule();

initSchedule() is responsible for loading and displaying the upcoming Souvenir Radio broadcast schedule.

Inside initSchedule(), the application first calls:

loadSchedule();

loadSchedule() fetches schedule information from:

souvenir-schedule.json

The returned schedule data is stored in a variable called shows.

Conceptually:

````
initSchedule() 
| 
v 
loadSchedule() 
| 
v 
Fetch souvenir-schedule.json 
| 
v 
Return schedule data 
| 
v 
shows

````
Once the schedule has been loaded, initSchedule() passes the schedule data into:

renderUpcomingBroadcasts(shows);

### renderUpcomingBroadcasts(shows)

renderUpcomingBroadcasts() takes the schedule data that has already been loaded and determines which upcoming broadcasts should be displayed on the page.

Unlike loadSchedule(), this method is not asynchronous. It does not fetch any external data. It processes the shows array that it receives and updates the page.

The method first finds the HTML element where upcoming broadcasts should be displayed:

const container =
document.getElementById("upcoming-broadcasts-list");

It then determines the current date and time:

const now = new Date();

The current time is used to determine which scheduled broadcasts are still upcoming.

The method creates a new array called upcomingShows in three steps.

1. Remove past or invalid broadcasts
```
   .filter((show) => {
   const start = new Date(show.start_time);
   return !Number.isNaN(start.getTime()) && start > now;
   })
```

Each show's start_time is converted into a JavaScript Date.

The method keeps the show only if:

start_time is a valid date
the broadcast begins sometime after the current time

Past broadcasts and invalid dates are removed.

2. Sort future broadcasts by start time

   ```
    .sort((a, b) => new Date(a.start_time)
      - new Date(b.start_time)) 

The remaining broadcasts are sorted chronologically.

The broadcast happening soonest appears first.

3. Keep only the next three broadcasts
   ```
   .slice(0, 3);
   ```

After filtering and sorting, only the first three upcoming broadcasts are kept.

The overall schedule-processing flow is:
````
All Scheduled Shows
|
v
Remove invalid dates
|
v
Remove past broadcasts
|
v
Sort future broadcasts
|
v
Keep next 3
|
v
Render Upcoming Shows
````
If there are no upcoming broadcasts, the page displays:

No upcoming live broadcasts scheduled.

## Now Playing Flow

After initSchedule() finishes, the application calls:

refresh();

refresh() is responsible for retrieving the current state of the radio station and updating the frontend.

The application calls refresh() once during startup and then calls it again every 15 seconds.

Conceptually:

````
refresh()
|
v
fetchNowPlaying()
|
v
AzuraCast Now Playing API
|
v
Now Playing JSON
|
v
updateUI(np)
|
v
Update Website
````

### fetchNowPlaying()

fetchNowPlaying() makes a request to the AzuraCast Now Playing API.

The response contains metadata describing the current state of the station, including information such as:

* Whether a DJ is currently live

* The currently playing artist

* The currently playing title

* Artwork

* Live streamer information
* Additional song metadata

The method returns this JSON data to refresh().

It is important to distinguish this request from the audio stream itself.

fetchNowPlaying() retrieves metadata about the station.

The actual radio audio is handled separately by the HTML <audio> element, which connects to the AzuraCast stream URL.

````
fetchNowPlaying()
|
v
Now Playing API
|
v
Station Metadata


<audio> element
       |
       v
AzuraCast Stream URL
       |
       v
Actual Audio

````
### updateUI(np)

After fetchNowPlaying() returns the station metadata, refresh() passes the response into:

updateUI(np);

np represents the Now Playing JSON returned by AzuraCast.

updateUI() examines that data and determines whether the station is currently playing an archived mix or receiving a live DJ broadcast.

At a high level:

               updateUI(np)
                    |
                    v
          Is a DJ currently live?
              /             \
            Yes              No
             |                |
             v                v
      Live Broadcast     Archived Mix
             |                |
             v                v
    Get streamer name    Read song data
             |                |
             v                v
    Lookup liveDjs.json   Artist / Title
              |           Description
              v           Artwork
    Show title / DJ            |
    Description                |
    Live artwork               |
              \                /
               \              /
                v            v
                  Update Page

If a DJ is live, the application uses the DJ's streamer_name to look up additional show information from the liveDjShows data loaded earlier during startup.

If there is no live DJ, the application displays metadata associated with the archived mix currently being played by AzuraCast.

### Recurring Updates

After the initial refresh() call, the application schedules another refresh every 15 seconds.

This allows the page to automatically react to changes in the station without requiring the listener to reload the website.

For example:
```
Archived Mix Playing
|
| DJ connects to AzuraCast
v
Next refresh occurs
|
v
fetchNowPlaying()
|
v
live.is_live = true
|
v
updateUI()
|
v
Frontend switches to
Live Broadcast display
```

This recurring refresh process allows Souvenir Radio to automatically update when:

A live DJ starts broadcasting
A live DJ stops broadcasting
The currently playing archived mix changes
Song or show metadata changes
Artwork changes