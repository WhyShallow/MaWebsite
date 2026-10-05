# Wallpapers

Put full-size wallpaper image files in this folder. To show one on the site, add an object to the `window.wallpaperCatalog` array in `wallpapers/catalog.js`:

```js
{
  name: "Wallpaper name",
  file: "/assets/wallpapers/wallpaper-name.jpg",
  filename: "wallpaper-name.jpg",
  resolution: "1920 x 1080",
  alt: "Short description of the image"
}
```

The image is used both as the preview and as the downloadable original. Use a descriptive `alt` value, and keep `filename` the same as the image's actual file name.
Keep wallpapers ordered from oldest to newest; the last entry appears in the homepage's latest-wallpaper feature.