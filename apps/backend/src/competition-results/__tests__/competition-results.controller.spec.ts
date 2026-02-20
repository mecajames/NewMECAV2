import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CompetitionResultsController } from '../competition-results.controller';
import { CompetitionResultsService } from '../competition-results.service';
import { ResultsImportService } from '../results-import.service';
import { Request } from 'express';

describe('CompetitionResultsController', () => {
  let controller: CompetitionResultsController;
  let competitionResultsService: typeof mockCompetitionResultsService;
  let resultsImportService: typeof mockResultsImportService;

  const mockCompetitionResultsService = {
    findAll: jest.fn().mockResolvedValue([]),
    getLeaderboard: jest.fn().mockResolvedValue([]),
    findByEvent: jest.fn().mockResolvedValue([]),
    findByCompetitorWithEvent: jest.fn().mockResolvedValue([]),
    findByMecaId: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
    getResultCountsByEvent: jest.fn().mockResolvedValue({}),
    getResultCountsByEventIds: jest.fn().mockResolvedValue({}),
    startManualSession: jest.fn().mockResolvedValue('session-123'),
    endManualSession: jest.fn().mockResolvedValue(undefined),
    updateEventPoints: jest.fn().mockResolvedValue(undefined),
    recalculateSeasonPoints: jest.fn().mockResolvedValue({ events_processed: 1, results_updated: 5, duration_ms: 100 }),
    importResults: jest.fn().mockResolvedValue({ message: 'ok', imported: 5, errors: [] }),
    recalculateAllPlacements: jest.fn().mockResolvedValue({ processed: 10, errors: 0 }),
    linkCompetitorsByMecaId: jest.fn().mockResolvedValue({ linked: 5, alreadyLinked: 3, noMatch: 2 }),
    populateStateFromProfiles: jest.fn().mockResolvedValue({ updated: 10 }),
    parseAndValidate: jest.fn().mockResolvedValue({ results: [], totalCount: 0, needsNameConfirmation: 0, needsDataCompletion: 0 }),
    checkForDuplicates: jest.fn().mockResolvedValue({ duplicates: [], nonDuplicates: [] }),
    importResultsWithResolution: jest.fn().mockResolvedValue({ message: 'ok', imported: 3, updated: 1, skipped: 1, errors: [] }),
  };

  const mockResultsImportService = {
    parseExcelFile: jest.fn().mockReturnValue([{ name: 'Test Competitor', score: 100 }]),
    parseTermLabFile: jest.fn().mockReturnValue([{ name: 'Lab Competitor', score: 95 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionResultsController],
      providers: [
        { provide: CompetitionResultsService, useValue: mockCompetitionResultsService },
        { provide: ResultsImportService, useValue: mockResultsImportService },
      ],
    }).compile();

    controller = module.get<CompetitionResultsController>(CompetitionResultsController);
    competitionResultsService = mockCompetitionResultsService;
    resultsImportService = mockResultsImportService;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------
  // getAllResults
  // ---------------------------------------------------------------
  describe('getAllResults', () => {
    it('should delegate to service.findAll and return the result', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }];
      competitionResultsService.findAll.mockResolvedValue(mockResults);

      const result = await controller.getAllResults();

      expect(competitionResultsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResults);
    });
  });

  // ---------------------------------------------------------------
  // getLeaderboard
  // ---------------------------------------------------------------
  describe('getLeaderboard', () => {
    it('should delegate to service.getLeaderboard with default options', async () => {
      const mockLeaderboard = [{ name: 'Player 1', points: 100 }];
      competitionResultsService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard('season-1');

      expect(competitionResultsService.getLeaderboard).toHaveBeenCalledWith('season-1', {
        format: undefined,
        competitionClass: undefined,
        rankBy: 'points',
        limit: 10,
      });
      expect(result).toEqual(mockLeaderboard);
    });

    it('should pass all provided query parameters', async () => {
      await controller.getLeaderboard('season-2', 'SQ', 'amateur', 'score', 25);

      expect(competitionResultsService.getLeaderboard).toHaveBeenCalledWith('season-2', {
        format: 'SQ',
        competitionClass: 'amateur',
        rankBy: 'score',
        limit: 25,
      });
    });

    it('should default rankBy to "points" when not provided', async () => {
      await controller.getLeaderboard('season-1', undefined, undefined, undefined, undefined);

      expect(competitionResultsService.getLeaderboard).toHaveBeenCalledWith('season-1', {
        format: undefined,
        competitionClass: undefined,
        rankBy: 'points',
        limit: 10,
      });
    });

    it('should convert limit to a number', async () => {
      // Query params come as strings from HTTP, but the controller does Number(limit)
      await controller.getLeaderboard('season-1', undefined, undefined, undefined, '5' as any);

      expect(competitionResultsService.getLeaderboard).toHaveBeenCalledWith('season-1', {
        format: undefined,
        competitionClass: undefined,
        rankBy: 'points',
        limit: 5,
      });
    });
  });

  // ---------------------------------------------------------------
  // getResultCountsByEvent
  // ---------------------------------------------------------------
  describe('getResultCountsByEvent', () => {
    it('should delegate to service.getResultCountsByEvent', async () => {
      const mockCounts = { 'event-1': 5, 'event-2': 10 };
      competitionResultsService.getResultCountsByEvent.mockResolvedValue(mockCounts);

      const result = await controller.getResultCountsByEvent();

      expect(competitionResultsService.getResultCountsByEvent).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCounts);
    });
  });

  // ---------------------------------------------------------------
  // getResultCountsByEvents (POST)
  // ---------------------------------------------------------------
  describe('getResultCountsByEvents', () => {
    it('should delegate to service.getResultCountsByEventIds with provided eventIds', async () => {
      const eventIds = ['event-1', 'event-2'];
      const mockCounts = { 'event-1': 5, 'event-2': 10 };
      competitionResultsService.getResultCountsByEventIds.mockResolvedValue(mockCounts);

      const result = await controller.getResultCountsByEvents({ eventIds });

      expect(competitionResultsService.getResultCountsByEventIds).toHaveBeenCalledWith(eventIds);
      expect(result).toEqual(mockCounts);
    });

    it('should default to empty array when eventIds is not provided', async () => {
      await controller.getResultCountsByEvents({} as any);

      expect(competitionResultsService.getResultCountsByEventIds).toHaveBeenCalledWith([]);
    });
  });

  // ---------------------------------------------------------------
  // getResultsByEvent
  // ---------------------------------------------------------------
  describe('getResultsByEvent', () => {
    it('should delegate to service.findByEvent with eventId', async () => {
      const mockResults = [{ id: '1', event_id: 'event-1' }];
      competitionResultsService.findByEvent.mockResolvedValue(mockResults);

      const result = await controller.getResultsByEvent('event-1');

      expect(competitionResultsService.findByEvent).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(mockResults);
    });
  });

  // ---------------------------------------------------------------
  // getResultsByCompetitor
  // ---------------------------------------------------------------
  describe('getResultsByCompetitor', () => {
    it('should delegate to service.findByCompetitorWithEvent', async () => {
      const mockResults = [{ id: '1', competitor_id: 'comp-1' }];
      competitionResultsService.findByCompetitorWithEvent.mockResolvedValue(mockResults);

      const result = await controller.getResultsByCompetitor('comp-1');

      expect(competitionResultsService.findByCompetitorWithEvent).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual(mockResults);
    });
  });

  // ---------------------------------------------------------------
  // getResultsByMecaId
  // ---------------------------------------------------------------
  describe('getResultsByMecaId', () => {
    it('should delegate to service.findByMecaId', async () => {
      const mockResults = [{ id: '1', meca_id: '12345' }];
      competitionResultsService.findByMecaId.mockResolvedValue(mockResults);

      const result = await controller.getResultsByMecaId('12345');

      expect(competitionResultsService.findByMecaId).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockResults);
    });
  });

  // ---------------------------------------------------------------
  // getResult
  // ---------------------------------------------------------------
  describe('getResult', () => {
    it('should delegate to service.findById', async () => {
      const mockResult = { id: 'result-1', score: 100 };
      competitionResultsService.findById.mockResolvedValue(mockResult);

      const result = await controller.getResult('result-1');

      expect(competitionResultsService.findById).toHaveBeenCalledWith('result-1');
      expect(result).toEqual(mockResult);
    });
  });

  // ---------------------------------------------------------------
  // createResult
  // ---------------------------------------------------------------
  describe('createResult', () => {
    it('should extract userId from body and delegate to service.create', async () => {
      const data = { score: 100, userId: 'user-1' } as any;
      const mockCreated = { id: 'new-1', score: 100 };
      competitionResultsService.create.mockResolvedValue(mockCreated);

      const result = await controller.createResult(data);

      expect(competitionResultsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100 }),
        'user-1',
      );
      // userId should be removed from data before passing to service
      expect(competitionResultsService.create.mock.calls[0][0]).not.toHaveProperty('userId');
      expect(result).toEqual(mockCreated);
    });

    it('should use created_by as fallback when userId is not provided', async () => {
      const data = { score: 100, created_by: 'user-2' } as any;
      competitionResultsService.create.mockResolvedValue({});

      await controller.createResult(data);

      expect(competitionResultsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100 }),
        'user-2',
      );
    });

    it('should pass undefined when neither userId nor created_by is provided', async () => {
      const data = { score: 100 } as any;
      competitionResultsService.create.mockResolvedValue({});

      await controller.createResult(data);

      expect(competitionResultsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100 }),
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // updateResult
  // ---------------------------------------------------------------
  describe('updateResult', () => {
    const mockRequest = {
      headers: { 'x-forwarded-for': '192.168.1.1' },
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should extract userId and ipAddress and delegate to service.update', async () => {
      const data = { score: 200, userId: 'user-1' } as any;
      const mockUpdated = { id: 'result-1', score: 200 };
      competitionResultsService.update.mockResolvedValue(mockUpdated);

      const result = await controller.updateResult('result-1', data, mockRequest);

      expect(competitionResultsService.update).toHaveBeenCalledWith(
        'result-1',
        expect.objectContaining({ score: 200 }),
        'user-1',
        '192.168.1.1',
      );
      expect(competitionResultsService.update.mock.calls[0][1]).not.toHaveProperty('userId');
      expect(result).toEqual(mockUpdated);
    });

    it('should extract IP from x-forwarded-for header, taking the first value', async () => {
      const reqMultipleIps = {
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      } as unknown as Request;

      await controller.updateResult('result-1', { score: 200 } as any, reqMultipleIps);

      expect(competitionResultsService.update).toHaveBeenCalledWith(
        'result-1',
        expect.anything(),
        undefined,
        '10.0.0.1',
      );
    });

    it('should fall back to socket.remoteAddress when x-forwarded-for is absent', async () => {
      const reqNoForwarded = {
        headers: {},
        socket: { remoteAddress: '192.168.0.10' },
        ip: '127.0.0.1',
      } as unknown as Request;

      await controller.updateResult('result-1', { score: 200 } as any, reqNoForwarded);

      expect(competitionResultsService.update).toHaveBeenCalledWith(
        'result-1',
        expect.anything(),
        undefined,
        '192.168.0.10',
      );
    });
  });

  // ---------------------------------------------------------------
  // deleteResult
  // ---------------------------------------------------------------
  describe('deleteResult', () => {
    const mockRequest = {
      headers: { 'x-forwarded-for': '192.168.1.1' },
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should extract userId, reason, and ipAddress and delegate to service.delete', async () => {
      await controller.deleteResult('result-1', { userId: 'user-1', reason: 'duplicate entry' }, mockRequest);

      expect(competitionResultsService.delete).toHaveBeenCalledWith(
        'result-1',
        'user-1',
        '192.168.1.1',
        'duplicate entry',
      );
    });

    it('should handle missing body gracefully', async () => {
      await controller.deleteResult('result-1', undefined, mockRequest);

      expect(competitionResultsService.delete).toHaveBeenCalledWith(
        'result-1',
        undefined,
        '192.168.1.1',
        undefined,
      );
    });

    it('should handle missing request gracefully', async () => {
      await controller.deleteResult('result-1', { userId: 'user-1' }, undefined);

      expect(competitionResultsService.delete).toHaveBeenCalledWith(
        'result-1',
        'user-1',
        undefined,
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // startManualSession
  // ---------------------------------------------------------------
  describe('startManualSession', () => {
    it('should delegate to service.startManualSession and return sessionId', async () => {
      competitionResultsService.startManualSession.mockResolvedValue('session-abc');

      const result = await controller.startManualSession({
        eventId: 'event-1',
        userId: 'user-1',
        format: 'SQ',
      });

      expect(competitionResultsService.startManualSession).toHaveBeenCalledWith(
        'event-1',
        'user-1',
        'SQ',
      );
      expect(result).toEqual({ sessionId: 'session-abc' });
    });

    it('should pass undefined format when not provided', async () => {
      competitionResultsService.startManualSession.mockResolvedValue('session-xyz');

      const result = await controller.startManualSession({
        eventId: 'event-2',
        userId: 'user-2',
      });

      expect(competitionResultsService.startManualSession).toHaveBeenCalledWith(
        'event-2',
        'user-2',
        undefined,
      );
      expect(result).toEqual({ sessionId: 'session-xyz' });
    });
  });

  // ---------------------------------------------------------------
  // endManualSession
  // ---------------------------------------------------------------
  describe('endManualSession', () => {
    it('should delegate to service.endManualSession and return success message', async () => {
      const result = await controller.endManualSession();

      expect(competitionResultsService.endManualSession).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Session ended successfully' });
    });
  });

  // ---------------------------------------------------------------
  // recalculateEventPoints
  // ---------------------------------------------------------------
  describe('recalculateEventPoints', () => {
    it('should delegate to service.updateEventPoints and return success message', async () => {
      const result = await controller.recalculateEventPoints('event-1');

      expect(competitionResultsService.updateEventPoints).toHaveBeenCalledWith('event-1');
      expect(result).toEqual({ message: 'Points recalculated successfully' });
    });

    it('should throw InternalServerErrorException when service throws', async () => {
      competitionResultsService.updateEventPoints.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.recalculateEventPoints('event-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should include original error message in the thrown exception', async () => {
      competitionResultsService.updateEventPoints.mockRejectedValue(
        new Error('No results found'),
      );

      await expect(controller.recalculateEventPoints('event-1')).rejects.toThrow(
        'Failed to recalculate points: No results found',
      );
    });
  });

  // ---------------------------------------------------------------
  // recalculateSeasonPoints
  // ---------------------------------------------------------------
  describe('recalculateSeasonPoints', () => {
    it('should delegate to service.recalculateSeasonPoints and return the result', async () => {
      const mockResult = { events_processed: 3, results_updated: 15, duration_ms: 250 };
      competitionResultsService.recalculateSeasonPoints.mockResolvedValue(mockResult);

      const result = await controller.recalculateSeasonPoints('season-1');

      expect(competitionResultsService.recalculateSeasonPoints).toHaveBeenCalledWith('season-1');
      expect(result).toEqual(mockResult);
    });
  });

  // ---------------------------------------------------------------
  // recalculateAllPlacements
  // ---------------------------------------------------------------
  describe('recalculateAllPlacements', () => {
    it('should delegate to service and return structured response', async () => {
      competitionResultsService.recalculateAllPlacements.mockResolvedValue({
        processed: 10,
        errors: 0,
      });

      const result = await controller.recalculateAllPlacements();

      expect(competitionResultsService.recalculateAllPlacements).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Placements recalculated successfully',
        processed: 10,
        errors: 0,
      });
    });
  });

  // ---------------------------------------------------------------
  // linkCompetitors
  // ---------------------------------------------------------------
  describe('linkCompetitors', () => {
    it('should delegate to service.linkCompetitorsByMecaId and return structured response', async () => {
      competitionResultsService.linkCompetitorsByMecaId.mockResolvedValue({
        linked: 5,
        alreadyLinked: 3,
        noMatch: 2,
      });

      const result = await controller.linkCompetitors();

      expect(competitionResultsService.linkCompetitorsByMecaId).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Competitors linked successfully',
        linked: 5,
        alreadyLinked: 3,
        noMatch: 2,
      });
    });
  });

  // ---------------------------------------------------------------
  // populateState
  // ---------------------------------------------------------------
  describe('populateState', () => {
    it('should delegate to service.populateStateFromProfiles and return structured response', async () => {
      competitionResultsService.populateStateFromProfiles.mockResolvedValue({ updated: 10 });

      const result = await controller.populateState();

      expect(competitionResultsService.populateStateFromProfiles).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'State codes populated successfully',
        updated: 10,
      });
    });
  });

  // ---------------------------------------------------------------
  // importResults
  // ---------------------------------------------------------------
  describe('importResults', () => {
    const createMockFile = (originalname: string): Express.Multer.File => ({
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      buffer: Buffer.from('test data'),
      size: 100,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.importResults('event-1', undefined as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importResults('event-1', undefined as any, 'user-1'),
      ).rejects.toThrow('No file uploaded');
    });

    it('should throw BadRequestException when createdBy is missing', async () => {
      const file = createMockFile('results.xlsx');

      await expect(
        controller.importResults('event-1', file, ''),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importResults('event-1', file, ''),
      ).rejects.toThrow('Created by user ID is required');
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const file = createMockFile('results.csv');

      await expect(
        controller.importResults('event-1', file, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importResults('event-1', file, 'user-1'),
      ).rejects.toThrow('Unsupported file type');
    });

    it('should parse xlsx files using resultsImportService.parseExcelFile', async () => {
      const file = createMockFile('results.xlsx');
      const parsedResults = [{ name: 'Test', score: 100 }];
      resultsImportService.parseExcelFile.mockReturnValue(parsedResults);

      await controller.importResults('event-1', file, 'user-1');

      expect(resultsImportService.parseExcelFile).toHaveBeenCalledWith(file.buffer);
      expect(competitionResultsService.importResults).toHaveBeenCalledWith(
        'event-1',
        parsedResults,
        'user-1',
        'xlsx',
        file,
      );
    });

    it('should parse xls files using resultsImportService.parseExcelFile', async () => {
      const file = createMockFile('results.xls');

      await controller.importResults('event-1', file, 'user-1');

      expect(resultsImportService.parseExcelFile).toHaveBeenCalledWith(file.buffer);
    });

    it('should parse tlab files using resultsImportService.parseTermLabFile', async () => {
      const file = createMockFile('results.tlab');
      const parsedResults = [{ name: 'Lab Test', score: 95 }];
      resultsImportService.parseTermLabFile.mockReturnValue(parsedResults);

      await controller.importResults('event-1', file, 'user-1');

      expect(resultsImportService.parseTermLabFile).toHaveBeenCalledWith(file.buffer);
      expect(competitionResultsService.importResults).toHaveBeenCalledWith(
        'event-1',
        parsedResults,
        'user-1',
        'tlab',
        file,
      );
    });

    it('should return the import result from service', async () => {
      const file = createMockFile('results.xlsx');
      const importResult = { message: 'Import complete', imported: 10, errors: [] };
      competitionResultsService.importResults.mockResolvedValue(importResult);

      const result = await controller.importResults('event-1', file, 'user-1');

      expect(result).toEqual(importResult);
    });
  });

  // ---------------------------------------------------------------
  // parseAndValidate
  // ---------------------------------------------------------------
  describe('parseAndValidate', () => {
    const createMockFile = (originalname: string): Express.Multer.File => ({
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      buffer: Buffer.from('test data'),
      size: 100,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.parseAndValidate('event-1', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const file = createMockFile('results.pdf');

      await expect(
        controller.parseAndValidate('event-1', file),
      ).rejects.toThrow('Unsupported file type');
    });

    it('should parse xlsx and delegate to service.parseAndValidate', async () => {
      const file = createMockFile('results.xlsx');
      const parsedResults = [{ name: 'Test', score: 100 }];
      resultsImportService.parseExcelFile.mockReturnValue(parsedResults);
      competitionResultsService.parseAndValidate.mockResolvedValue({
        results: parsedResults,
        totalCount: 1,
        needsNameConfirmation: 0,
        needsDataCompletion: 0,
      });

      const result = await controller.parseAndValidate('event-1', file);

      expect(resultsImportService.parseExcelFile).toHaveBeenCalledWith(file.buffer);
      expect(competitionResultsService.parseAndValidate).toHaveBeenCalledWith('event-1', parsedResults);
      expect(result).toEqual({
        results: parsedResults,
        totalCount: 1,
        needsNameConfirmation: 0,
        needsDataCompletion: 0,
        fileExtension: 'xlsx',
      });
    });

    it('should parse tlab files and include fileExtension in response', async () => {
      const file = createMockFile('results.tlab');
      const parsedResults = [{ name: 'Lab', score: 95 }];
      resultsImportService.parseTermLabFile.mockReturnValue(parsedResults);
      competitionResultsService.parseAndValidate.mockResolvedValue({
        results: parsedResults,
        totalCount: 1,
        needsNameConfirmation: 0,
        needsDataCompletion: 0,
      });

      const result = await controller.parseAndValidate('event-1', file);

      expect(resultsImportService.parseTermLabFile).toHaveBeenCalledWith(file.buffer);
      expect(result.fileExtension).toBe('tlab');
    });
  });

  // ---------------------------------------------------------------
  // checkDuplicates
  // ---------------------------------------------------------------
  describe('checkDuplicates', () => {
    const createMockFile = (originalname: string): Express.Multer.File => ({
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      buffer: Buffer.from('test data'),
      size: 100,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.checkDuplicates('event-1', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const file = createMockFile('results.json');

      await expect(
        controller.checkDuplicates('event-1', file),
      ).rejects.toThrow('Unsupported file type');
    });

    it('should parse xlsx and check for duplicates', async () => {
      const file = createMockFile('results.xlsx');
      const parsedResults = [{ name: 'Test', score: 100 }];
      resultsImportService.parseExcelFile.mockReturnValue(parsedResults);
      competitionResultsService.checkForDuplicates.mockResolvedValue({
        duplicates: [{ index: 0, existing: { id: 'old-1' } }],
        nonDuplicates: [],
      });

      const result = await controller.checkDuplicates('event-1', file);

      expect(resultsImportService.parseExcelFile).toHaveBeenCalledWith(file.buffer);
      expect(competitionResultsService.checkForDuplicates).toHaveBeenCalledWith('event-1', parsedResults);
      expect(result).toEqual({
        duplicates: [{ index: 0, existing: { id: 'old-1' } }],
        nonDuplicates: [],
        parsedResults,
      });
    });

    it('should parse tlab files for duplicate checking', async () => {
      const file = createMockFile('results.tlab');
      const parsedResults = [{ name: 'Lab', score: 95 }];
      resultsImportService.parseTermLabFile.mockReturnValue(parsedResults);
      competitionResultsService.checkForDuplicates.mockResolvedValue({
        duplicates: [],
        nonDuplicates: [0],
      });

      const result = await controller.checkDuplicates('event-1', file);

      expect(resultsImportService.parseTermLabFile).toHaveBeenCalledWith(file.buffer);
      expect(result.parsedResults).toEqual(parsedResults);
    });
  });

  // ---------------------------------------------------------------
  // importWithResolution
  // ---------------------------------------------------------------
  describe('importWithResolution', () => {
    const mockRequest = {
      headers: { 'x-forwarded-for': '10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should throw BadRequestException when parsedResults is missing', async () => {
      await expect(
        controller.importWithResolution('event-1', {
          parsedResults: undefined as any,
          resolutions: {},
          createdBy: 'user-1',
          fileExtension: 'xlsx',
        }, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when createdBy is missing', async () => {
      await expect(
        controller.importWithResolution('event-1', {
          parsedResults: [{ name: 'Test' }],
          resolutions: {},
          createdBy: '',
          fileExtension: 'xlsx',
        }, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to service.importResultsWithResolution', async () => {
      const body = {
        parsedResults: [{ name: 'Test', score: 100 }],
        resolutions: { 0: 'replace' as const },
        createdBy: 'user-1',
        fileExtension: 'xlsx',
      };
      const serviceResult = { message: 'ok', imported: 1, updated: 1, skipped: 0, errors: [] };
      competitionResultsService.importResultsWithResolution.mockResolvedValue(serviceResult);

      const result = await controller.importWithResolution('event-1', body, mockRequest);

      expect(competitionResultsService.importResultsWithResolution).toHaveBeenCalledWith(
        'event-1',
        body.parsedResults,
        'user-1',
        'xlsx',
        { 0: 'replace' },
        undefined,
        '10.0.0.1',
      );
      expect(result).toEqual(serviceResult);
    });

    it('should default fileExtension to xlsx and resolutions to empty object', async () => {
      const body = {
        parsedResults: [{ name: 'Test' }],
        resolutions: undefined as any,
        createdBy: 'user-1',
        fileExtension: '' as any,
      };

      await controller.importWithResolution('event-1', body, mockRequest);

      expect(competitionResultsService.importResultsWithResolution).toHaveBeenCalledWith(
        'event-1',
        body.parsedResults,
        'user-1',
        'xlsx',
        {},
        undefined,
        '10.0.0.1',
      );
    });

    it('should extract IP address from request', async () => {
      const body = {
        parsedResults: [{ name: 'Test' }],
        resolutions: {},
        createdBy: 'user-1',
        fileExtension: 'xlsx',
      };

      await controller.importWithResolution('event-1', body, mockRequest);

      expect(competitionResultsService.importResultsWithResolution).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        '10.0.0.1',
      );
    });
  });
});
