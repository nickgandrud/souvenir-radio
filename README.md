# souvenir-radio
Website document/how it works

http://104.236.123.205



How the <audio> element works

For this website the <audio> element is wrapped in the class controls which has the play and stop button (eventually will have a volume control )
The <audio> element gets the source (aka the server hosting the music) from the AZURACAST_BASE


The <audio> element is a native browser media player.

In the javascript file I have 







Flow of the website when a user gets to it and doesn’t click on anything

1. User gets to the screen. Picture and text are empty in the card. The Code starts top to bottom. Elements are brought from the html to the js as constants (Lines 9-13). The playBtn, stopBtn, and streamSelect are all given event listeners. 
2. The first method is hit in the automatic flow refresh(). This is basically how the app will function given that it needs to update text and pictures  
3. The first thing you will see when the refresh method is hit is that the function is asynchronous. This is because inside the method there is an await delcartive to for the method fetchNowPlaying() which fetches the static json from the radio broadcast on Azura cast. Because this is async, the code underneath refresh() will continue even while it is waiting to retrieve that static json file.  
    1. Inside of the async fetchNowPlaying, a url is created that hits the exposed Now Playing Api endpoint. Azuracast write the api endpoint to a static json file, hence why the endpoint ends in .json. The next line of code generates a response object using a javasciprt fetch method and the contracted url. This is also asynchronous since it needs to wait for a response for the json from azuracast. The json object azuracast provides has important data like if the station is online, how many listeners, the cover art name of what is being played and the url for the stream playback. Note: Later in the implementation I will need to fetch data such as DJ Name, Dj Show Name and Information about the show.
    2. After the response is returned from azuracast, the fetchNowPlaying returns the response as a json object. This json object is kept as np or now playing. We then see that the method updateUI gets called with np as a parameter.
    3. Inside of the updateUI function, we see that  it parses the np/nowplaying json object into 3 const/vars: song, artist, title. After the json is parsed we now see that the function setText is called. It takes in an id and text. The id is what div will be replaced (track) and text is what will replace it (Artist and track name) . Note: Like above, this will need to get changed later to include what I had listed. 
    4. Underneath we check if the station/dj is live and display whether or not it is live. Everything up until setArt is kinda the same.
    5. Set art takes in the url from the json that has the cover art info and sets it in art.src = url. We are now at the end of the update ui function. 
4. This is the end of the refresh. The next step is to understand the play button that streams the audio form the server to the computer

5. When the play button is clicked, the addEventListner method is called. It first checks to see if the audio element of the website has the source of the streaming mp3 file. If it doesn’t, the audio.src will be set to the streaming mp3 url that is hosted on Azura cast. After that check, the code sees if the audio is paused. Since this is the first time the user is clicking on the button, it is true it is paused, so the code will then attempt to play the streaming audio. It will then exit.  When the user wants to pause, they will click on the button again. Because the audio is not paused, the else flag will be hit and the audio will be paused. 




Alpha version of site: The website will host a continuous stream of mixes that have been already broadcasted. The mixes will be stored in 

The next step will be to maintain a json file that has the name of the radio shows, description and Djs. I think that I can maintain the images of the stations in azuracast. 

Two test radio shows: 
DJ: User 1 -  Name: Souvenir Shop - Description: Welcome. This is a test for the description. 
DJ: User 2 - Name : Souvenir Shop 2 - 	Shop - Test 2
       


