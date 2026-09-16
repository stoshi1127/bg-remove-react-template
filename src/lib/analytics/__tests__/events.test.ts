import { trackPageView } from '../events';

describe('trackPageView', () => {
  beforeEach(() => {
    window.gtag = jest.fn();
  });

  afterEach(() => {
    delete window.gtag;
  });

  test('keeps query parameters in page_location without duplicating them in page_path', () => {
    trackPageView('/?buyPro=1#pro', 'Pro purchase');

    expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/',
      page_title: 'Pro purchase',
      page_location: 'http://localhost/?buyPro=1#pro',
      send_to: 'G-YT0ZDBKL81',
    });
  });
});
