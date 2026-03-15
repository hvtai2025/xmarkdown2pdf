import { PdfExporter } from '../../exporter/PdfExporter';

const setContent = jest.fn().mockResolvedValue(undefined);
const setRequestInterception = jest.fn().mockResolvedValue(undefined);
const requestOn = jest.fn();
const evaluate = jest.fn().mockResolvedValue(undefined);
const pdf = jest.fn().mockResolvedValue(undefined);

const page = {
  setContent,
  setRequestInterception,
  on: requestOn,
  evaluate,
  pdf,
};

const newPage = jest.fn().mockResolvedValue(page);
const close = jest.fn().mockResolvedValue(undefined);

const launch = jest.fn().mockResolvedValue({
  newPage,
  close,
});

jest.mock('puppeteer', () => ({
  launch,
}));

describe('PdfExporter (Phase 3)', () => {
  const context = {
    extensionPath: process.cwd(),
    extensionUri: { fsPath: process.cwd() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('launches puppeteer and writes a PDF', async () => {
    await PdfExporter.export('<nav class="table-of-contents"><a href="#hi">Hi</a></nav><h1 id="hi">Hi</h1>', '/tmp/test.pdf', context);

    expect(launch).toHaveBeenCalledTimes(1);
    expect(newPage).toHaveBeenCalledTimes(1);
    expect(setRequestInterception).toHaveBeenCalledWith(true);
    expect(requestOn).toHaveBeenCalledWith('request', expect.any(Function));
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'), { waitUntil: 'domcontentloaded' });
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('table-of-contents'), { waitUntil: 'domcontentloaded' });
    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({
      path: '/tmp/test.pdf',
      printBackground: true,
    }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('closes browser even if page.pdf fails', async () => {
    pdf.mockRejectedValueOnce(new Error('pdf failed'));

    await expect(PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context)).rejects.toThrow('pdf failed');
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('ignores evaluate wait errors and still generates pdf', async () => {
    evaluate.mockRejectedValueOnce(new Error('wait timeout'));

    await PdfExporter.export('<h1>Hi</h1>', '/tmp/test.pdf', context);

    expect(pdf).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
