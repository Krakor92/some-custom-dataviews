class AudioManager {
    AudioManager = class {
        constructor({
            enableSimultaneousPlaying = false,
            autoplay = true,
            stopAutoplayWhenReachingLastMusic = true,
            defaultVolume = 0.5,
            logger, utils, icons,
        } = {}) {
            this.logger = logger
            this.icons = icons
            this.utils = utils
            this.os = utils.getOS()

            this.enableSimultaneousPlaying = enableSimultaneousPlaying
            this.autoplay = autoplay
            this.stopAutoplayWhenReachingLastMusic = stopAutoplayWhenReachingLastMusic
            this.currentMP3Playing = -1
            this.numberOfAudiosLoaded = -1
            this.defaultVolume = defaultVolume
        }

        /**
         * @param {HTMLInputElement} timeline
         * @param {HTMLAudioElement} audio
         */
        onChangeTimelinePosition = (timeline, audio) => {
            const percentagePosition = (100 * audio.currentTime) / audio.duration;
            timeline.style.backgroundSize = `${percentagePosition}% 100%`;
            timeline.value = percentagePosition;
        }

        /**
         * @param {HTMLInputElement} timeline
         * @param {HTMLAudioElement} audio
         */
        onChangeSeek = (timeline, audio) => {
            const time = (timeline.value * audio.duration) / 100;
            audio.currentTime = time;
        }

        /**
         * @param {object} _
         * @param {number} _.index
         * @param {HTMLAudioElement[]} _.audios
         * @param {HTMLButtonElement[]} _.playButtons
         */
        onPlayAudio = async ({ index, audios, playButtons }) => {
            if (!this.enableSimultaneousPlaying && this.currentMP3Playing !== -1 && this.currentMP3Playing !== index) {
                audios[this.currentMP3Playing].pause()
            }

            // Handle volume
            const dataVolume = parseFloat(audios[index].dataset.volume)
            if (!isNaN(dataVolume)) {
                audios[index].volume = this.utils.clamp(this.defaultVolume + dataVolume, 0.1, 1)
            } else {
                audios[index].volume = this.utils.clamp(this.defaultVolume, 0.1, 1)
            }

            this.currentMP3Playing = index;

            await this.reloadMp3IfCorrupt(audios[index])

            playButtons[index].innerHTML = this.icons.pauseIcon;
        }

        /**
         * 
         * @param {object} _ 
         * @param {HTMLButtonElement} _.playButton 
         * @param {HTMLAudioElement} _.audio 
         */
        onPauseAudio = ({ playButton, audio, index }) => {
            if (this.currentMP3Playing === index) {
                // This if check is needed to not break the 'disable simultaneous playing of mp3' feature
                this.currentMP3Playing = -1;
            }
            audio.pause();
            playButton.innerHTML = this.icons.playIcon;
        }

        /**
         * @param {object} _
         * @param {number} _.index
         * @param {HTMLAudioElement[]} _.audios
         */
        onPlayButtonClick = async ({ index, audios }) => {
            if (audios[index].paused) {
                await audios[index].play()
            } else {
                audios[index].pause()
            }
        }

        onEnded = async ({audios, index, timeline, playButton,}) => {
            this.currentMP3Playing = -1
            playButton.innerHTML = this.icons.playIcon
            timeline.value = 0
            timeline.style.backgroundSize = "0% 100%"

            if (!this.autoplay
                || audios.length === 1
                || (this.stopAutoplayWhenReachingLastMusic && index + 1 === audios.length)) {
                return;
            }

            let nextIndex = 0
            if (index + 1 != audios.length) nextIndex = index + 1

            if (this.os === "Android") {
                this.checkLoadedMp3Status(audios[nextIndex])
            }

            await audios[nextIndex].play()
        }

        /**
        * This function should be called every time new scores are added at the end of the grid (because of scroll)
        * or if the grid of score is re-arranged because of new filters ?
        * It:
        * - Binds the update of the audio to the progress of the timeline
        * - Handle what happened when you click on the custom button
        * - Make possible to drag the timeline to change the audio timecode
        * - Supports automatic playback of the next found mp3 (which is already loaded in the grid of course)
        * 
        * I'm using on... properties here because I only need one handler per audio at all time
        * and I don't want to handle the adding and removing of eventListener manually
        * 
        * @param {import('../view').CollectionManager} collectionManager - An object responsible of a collection of DomElement
        * It must implement a function getParent() that returns the parent DomElement of the collection
        */
        manageMp3Scores(collectionManager) {
            this.logger?.reset()

            /** @type {HTMLAudioElement[]} */
            const audios = collectionManager.getParent().querySelectorAll('audio')

            /** @type {HTMLButtonElement[]} */
            const playButtons = collectionManager.getParent().querySelectorAll('.audio-player button')

            /** @type {HTMLInputElement[]} */
            const trackTimelines = collectionManager.getParent().querySelectorAll('input.timeline')

            if (this.numberOfAudiosLoaded === audios.length) return;
            this.numberOfAudiosLoaded = audios.length


            // Must never happen
            if (audios.length !== playButtons.length) {
                console.error("The number of play buttons doesn't match the number of audios")
            }

            for (let i = 0; i < audios.length; i++) {
                if (this.os === "Android") {
                    audios[i].onloadedmetadata = () => this.checkLoadedMp3Status(audios[i])
                }

                audios[i].ontimeupdate = () => this.onChangeTimelinePosition(trackTimelines[i], audios[i])

                audios[i].onplay = () => this.onPlayAudio({ index: i, audios, playButtons })

                audios[i].onpause = () => this.onPauseAudio({ playButton: playButtons[i], audio: audios[i], index: i })

                playButtons[i].onclick = () => this.onPlayButtonClick({ index: i, audios })

                trackTimelines[i].onchange = () => this.onChangeSeek(trackTimelines[i], audios[i])

                audios[i].onended = () => this.onEnded({
                    audios,
                    index: i,
                    timeline: trackTimelines[i],
                    playButton: playButtons[i],
                })
            }

            this.logger?.logPerf("Reloading all the mp3 management")
        }

        /**
        * @description Since Android audios are sometimes corrupted, this function flag them (by coloring the timecode tag) to:
        *  - Skip them on autoplay
        *  - Visually mark them so that the user know they didn't load correctly
        * Edit: Big twist as of today (2023-01-04). Even mp3 with correct loading time may not play completely. I've experienced this with Elegia today, i was flabbergasted...
        *       So it truly is unreliable on Android after all 😥. I still keep this function though because i'm sure it's still better than nothing
        * @param {HTMLAudioElement} audio
        */
        checkLoadedMp3Status = (audio) => {
            const timecodeTag = audio.parentNode.parentNode.querySelector(".timecode")
            if (!timecodeTag) return;

            const timecodeDuration = this.utils.convertTimecodeToDuration(timecodeTag.querySelector("span").innerText)

            // Even in this state, the audio may not play completely...
            if (Math.abs(timecodeDuration - audio.duration) <= 1) {
                timecodeTag.style.backgroundColor = "#060D"
                return true;
            }

            if (audio.classList.contains("corrupt")) {
                timecodeTag.style.backgroundColor = "#600D"
                return
            }

            // Modifying the src property after it has been loaded doesn't do anything (https://stackoverflow.com/a/68797896)
            audio.classList.add("corrupt")
            timecodeTag.style.backgroundColor = "#F808"

            return false;
        }

        /**
        * @description I don't know why but most of the time, audios fail to load on Android for no specific reasons
        * I tried to:
        *  - Remove the <source> and replace it with a new one but it doesn't load it
        *  - Set the src of the audio tag to the one of the source to override it but that doesn't work either
        * 
        * I guess it can't be patched like that 😕, so i should report this bug on obsidian forum
        * Edit: Here is the link to the issue i've created : https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684
        * Edit 2: Hahaha nobody cares (as expected 😅)
        * Edit 3: @Majed6 on Discord said he had the same problem and he found a workaround, unfortunatly, it doesn't completely solve the issue 😞
        * @param {HTMLAudioElement} audio
        */
        reloadMp3IfCorrupt = async (audio) => {
            if (!audio.classList.contains("corrupt")) return;

            // from: https://github.com/Majed6/android-audio-fixer/blob/master/main.ts
            if (!audio.classList.contains("processed")) {
                audio.classList.add('processed');
                const file = await fetch(audio.firstElementChild.src);
                const fileBlob = await file.blob();
                audio.src = URL.createObjectURL(fileBlob);
            }
        }
    }
}