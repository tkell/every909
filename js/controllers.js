var sequenceApp = angular.module('sequenceApp', [])

sequenceApp.controller('SequencerControl', function ($scope, $http, $timeout) {
    var numTracks = 11
    var length = numTracks * 16
    var start  = new Date("January 19, 2017 01:00:00");
    var now = new Date();

    now = now.getTime() / 1000
    start = start.getTime() / 1000
    now = new BigNumber(now)
    start = new BigNumber(start)
    var offset = Math.floor((now - start) / 2)



    // Set up samples and sequences
    $scope.samples = [
        {'name': 'hihat', 'url': 'audio/hh.wav'},
        {'name': 'snare', 'url': 'audio/sd.wav'},
        {'name': 'bass', 'url': 'audio/bd.wav'},
        {'name': 'clap', 'url': 'audio/cp.wav'},
        {'name': 'rim', 'url': 'audio/rs.wav'},
        {'name': 'ride', 'url': 'audio/rd.wav'},
        {'name': 'openhat', 'url': 'audio/oh.wav'},
        {'name': 'lowtom', 'url': 'audio/lt.wav'},
        {'name': 'midtom', 'url': 'audio/mt.wav'},
        {'name': 'hitom', 'url': 'audio/ht.wav'},
        {'name': 'crash', 'url': 'audio/cr.wav'},
    ]

    var getPattern = function(index, patternArray) {
        return patternArray.slice(index * 16, (index + 1) * 16)
    }
    
    $scope.sequences = [
        {'sample': $scope.samples[0], 'gain': 1.0, 'buffer': null, 'pattern': null},
        // {'sample': $scope.samples[1], 'gain': 0.7, 'buffer': null,
        // 'pattern':  ['-', '-', '-', '-', 's', '-', '-', '-', '-', '-', '-', '-', 's', '-', '-', '-']
        // },
        // {'sample': $scope.samples[2], 'gain': 0.5, 'buffer': null,
        // 'pattern':  ['-', '-', 'h', '-', '-', '-', 'h', '-', '-', '-', 'h', '-', '-', '-', 'h', '-']
        // },
    ]

    var numToPattern = function(num) {
        var binaryString = num.toString(2)
        var padSize = length - binaryString.length
        var padStr = new Array(padSize + 1).join('0')

        binaryString = padStr + binaryString
        var patternArray = binaryString.split('').reverse()
        console.log(patternArray)
        $scope.sequences[0].pattern = getPattern(0, patternArray)
    }

    // load it!
    numToPattern(offset);


    var promises = 0
    // Create audio context, load audio
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    loadAudio = function(url, sequence) {
        $http.get(url, {'responseType': 'arraybuffer'}).success(function(data) {
            context.decodeAudioData(data, function(buffer) {
                sequence.buffer = buffer
                promises = promises + 1
                console.log("loaded audio", promises)
                if (promises == 1) {
                    transport.isPlaying = true
                    schedulePlay(context.currentTime)
                    console.log("playing !", promises)
                }
            }, function() {console.log('Error Loading audio!')})
        })
    }

    for (var i = 0; i < $scope.sequences.length; i++) {
        var sample = $scope.sequences[i].sample
        loadAudio(sample.url, $scope.sequences[i])
    }

    // Global transport object for dealing with timing
    var transport = {
        'tempo':  120,
        'isPlaying': false,
        'currentIndex': 0,
        'oldIndex': 0,
        'visualIndex': -1,
        'numLoops': 0,
        'loopCounter': 0,
        'lookAhead': 0.1, // seconds
        'scheduleInterval': 30, // milliseconds
    }

    // Private functions for playback
    function getNextNoteTime(startTime, sixteenthNote) {
        var loopOffset = transport.numLoops * (240.0 / transport.tempo)
        var indexOffset = (transport.currentIndex - transport.oldIndex)  * sixteenthNote
        return startTime + loopOffset + indexOffset
    }

    schedulePlay = function(startTime) {
        if (transport.isPlaying == false) {
            transport.oldIndex = transport.currentIndex
            return
        }
        // Find the time until the next note
        var sixteenthNote = 60.0 / transport.tempo / 4.0 // seconds
        var nextNoteTime = getNextNoteTime(startTime, sixteenthNote)

        // Schedule the next note or notes using playSound
        while (nextNoteTime < context.currentTime + transport.lookAhead) {
            for (var i = 0; i < $scope.sequences.length; i++) {
                var seq = $scope.sequences[i]
                if (seq.pattern[transport.currentIndex] != '0') {
                    playSound(nextNoteTime, seq.buffer, seq.gain)
                } else if (transport.currentIndex == 0 && transport.numLoops == 0) {
                    // Bootstrap the start:
                    // Web Audio will not start the audioContext timer moving, 
                    // unless we give it something to play.
                    playSound(nextNoteTime, seq.buffer, 0.0)
                }
            }
            // Increment the overall sequence,
            transport.currentIndex = (transport.currentIndex + 1) % 16

            // Increment each sequence's graphics, on schedule
            var theTime = (nextNoteTime - context.currentTime) *  1000
            $timeout(function() {
                transport.visualIndex = (transport.visualIndex + 1) % 16
            }, theTime)

            // Keep track of where our audio-time loop is
            transport.loopCounter++
            if (transport.loopCounter == 16) {
                transport.numLoops++
                // re-generate the pattern!
                offset = offset + 1
                numToPattern(offset);
                transport.loopCounter = 0
            }

            // Update the tempo
            sixteenthNote = 60.0 / transport.tempo / 4.0 // seconds
            nextNoteTime = nextNoteTime + sixteenthNote
        }

        // Once all notes in this range are added, schedule the next call
        $timeout(function() {
            schedulePlay(startTime)
        }, transport.scheduleInterval)
    }

    // Raw, strongly-timed WebAudio playback
    playSound = function(when, buffer, gain) {
        var source = context.createBufferSource()
        source.buffer = buffer
        var gainNode = context.createGain();
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.start(when)
        return source
    }
})
