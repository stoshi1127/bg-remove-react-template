import React, { StrictMode } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import UsageSurvey, { SURVEY_KEY, SURVEY_COOLDOWN, useUsageSurvey } from '../UsageSurvey';

const context = { user_plan: 'guest', processing_mode: 'standard', image_count: 2 };
beforeEach(() => { localStorage.clear(); window.gtag = jest.fn(); });
afterEach(() => { jest.restoreAllMocks(); });

describe('usage survey', () => {
  test('records one impression across processing/result mounts and only one answer', () => {
    const { result } = renderHook(() => useUsageSurvey(), { wrapper: StrictMode });
    act(() => result.current.begin(context));
    const view = render(<UsageSurvey survey={result.current} placement="processing" />);
    view.unmount();
    render(<UsageSurvey survey={result.current} placement="result" />);
    act(() => {
      result.current.answer('ecommerce', 'result');
      result.current.answer('personal', 'result');
    });
    expect(window.gtag).toHaveBeenCalledTimes(2);
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'usage_survey_answer', {
      ...context, survey_version: 'v1', placement: 'result', purpose: 'ecommerce',
    });
    expect(result.current.status).toBe('answered');
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('hidden');
  });

  test('cooldown starts on display, not scheduling, and expires after seven days', () => {
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    expect(localStorage.getItem(SURVEY_KEY)).toBeNull();
    act(() => { result.current.shown('processing'); result.current.dismiss('processing'); });
    const shownAt = JSON.parse(localStorage.getItem(SURVEY_KEY)).lastShownAt;
    jest.spyOn(Date, 'now').mockReturnValue(shownAt + SURVEY_COOLDOWN - 1);
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('hidden');
    jest.spyOn(Date, 'now').mockReturnValue(shownAt + SURVEY_COOLDOWN);
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('question');
  });

  test('full failure or cancellation closes; partial success retains the question', () => {
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    act(() => result.current.finish(true));
    expect(result.current.status).toBe('question');
    act(() => result.current.finish(false));
    expect(result.current.status).toBe('hidden');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  test.each(['broken', '{}', '{"answered":false,"lastShownAt":"bad"}'])('invalid storage %s does not block survey', raw => {
    localStorage.setItem(SURVEY_KEY, raw);
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('question');
  });

  test('stored answer suppresses display across mounts', () => {
    localStorage.setItem(SURVEY_KEY, JSON.stringify({ answered: true, lastShownAt: 1 }));
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('hidden');
  });

  test('blocked storage and missing analytics preserve page-local suppression', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    delete window.gtag;
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    act(() => result.current.shown('processing'));
    act(() => result.current.answer('other', 'processing'));
    expect(result.current.status).toBe('answered');
    act(() => result.current.begin(context));
    expect(result.current.status).toBe('hidden');
  });

  test('buttons submit immediately without another form step', () => {
    function Harness() {
      const survey = useUsageSurvey();
      return <><button onClick={() => survey.begin(context)}>Start</button><UsageSurvey survey={survey} placement="processing" /></>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByText('仕事の資料・プレゼン'));
    expect(screen.getByRole('status').textContent).toBe('ご協力ありがとうございます');
  });

  test('skip removes the question and records one explicit dismissal', () => {
    function Harness() {
      const survey = useUsageSurvey();
      return <><button onClick={() => survey.begin(context)}>Start</button><UsageSurvey survey={survey} placement="processing" /></>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByText('回答しない'));
    expect(screen.queryByText('この画像は、主に何に使いますか？')).toBeNull();
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'usage_survey_dismiss', { ...context, survey_version: 'v1', placement: 'processing' });
    fireEvent.click(screen.getByText('Start'));
    expect(screen.queryByText('この画像は、主に何に使いますか？')).toBeNull();
    expect(window.gtag).toHaveBeenCalledTimes(2);
  });

  test('analytics exceptions cannot block answering', () => {
    window.gtag = jest.fn(() => { throw new Error('analytics failed'); });
    const { result } = renderHook(() => useUsageSurvey());
    act(() => result.current.begin(context));
    act(() => result.current.answer('other', 'processing'));
    expect(result.current.status).toBe('answered');
    expect(JSON.parse(localStorage.getItem(SURVEY_KEY)).answered).toBe(true);
  });
});
