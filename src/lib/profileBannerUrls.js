const DESKTOP_SUFFIX = '-desktop.jpg';

export function getMobileProfileBannerUrl(desktopUrl) {
  if (!desktopUrl?.includes(DESKTOP_SUFFIX)) return desktopUrl || '';
  return desktopUrl.replace(DESKTOP_SUFFIX, '-mobile.jpg');
}

export function getSourceProfileBannerUrl(desktopUrl) {
  if (!desktopUrl?.includes(DESKTOP_SUFFIX)) return desktopUrl || '';
  return desktopUrl.replace(DESKTOP_SUFFIX, '-source.jpg');
}
