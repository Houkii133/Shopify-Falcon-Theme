/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class ShoppableVideos extends HTMLElement {
  constructor () {
    super()

    this.querySelectorAll('video').forEach(video => {
      video.addEventListener('click', () => {
        this.onVideoPlay(video)
      })
    })

    this.querySelector('.carousel-track').addEventListener('scroll', () => {
      this.querySelectorAll('video').forEach(video => {
        if (video.closest('.shoppable-videos-card').dataset.playing === 'true') {
          video.closest('.shoppable-videos-card').setAttribute('data-playing', 'false')
          video.pause()
        }
      })
    })
  }

  onVideoPlay (video) {
    this.querySelectorAll('video').forEach(elem => {
      if (elem.dataset.index !== video.dataset.index) {
        elem.closest('.shoppable-videos-card').setAttribute('data-playing', 'false')
        elem.pause()
      }
    })

    const card = video.closest('.shoppable-videos-card')

    if (card.dataset.playing === 'true') {
      card.setAttribute('data-playing', 'false')
      video.pause()
    } else {
      card.setAttribute('data-playing', 'true')
      video.muted = false
      video.play()
    }
  }
}
customElements.define('shoppable-videos', ShoppableVideos)