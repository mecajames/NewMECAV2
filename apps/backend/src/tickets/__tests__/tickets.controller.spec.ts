import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from '../tickets.controller';
import { TicketsService } from '../tickets.service';
import {
  TicketCategory,
  TicketDepartment,
  TicketPriority,
} from '@newmeca/shared';

describe('TicketsController', () => {
  let controller: TicketsController;
  let mockService: Record<string, jest.Mock>;

  const TEST_TICKET_ID = 'ticket_123';
  const TEST_USER_ID = 'user_456';
  const TEST_TICKET_NUMBER = 'MECA-20260219-0001';
  const TEST_COMMENT_ID = 'comment_789';
  const TEST_ATTACHMENT_ID = 'attachment_abc';

  const mockTicket = {
    id: TEST_TICKET_ID,
    ticketNumber: TEST_TICKET_NUMBER,
    title: 'Test Ticket',
    description: 'A test ticket description',
    category: 'general',
    priority: 'medium',
    status: 'open',
    reporter: { id: TEST_USER_ID, email: 'test@example.com' },
  };

  const mockComment = {
    id: TEST_COMMENT_ID,
    content: 'Test comment',
    isInternal: false,
    author: { id: TEST_USER_ID, email: 'test@example.com' },
  };

  const mockAttachment = {
    id: TEST_ATTACHMENT_ID,
    fileName: 'test.pdf',
    filePath: '/uploads/test.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getStats: jest.fn().mockResolvedValue({ total: 0, open: 0 }),
      getMyTickets: jest.fn().mockResolvedValue([]),
      getAssignedTickets: jest.fn().mockResolvedValue([]),
      getTicketsForStaff: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findByTicketNumber: jest.fn().mockResolvedValue(mockTicket),
      findById: jest.fn().mockResolvedValue(mockTicket),
      create: jest.fn().mockResolvedValue(mockTicket),
      update: jest.fn().mockResolvedValue(mockTicket),
      delete: jest.fn().mockResolvedValue(undefined),
      assignTicket: jest.fn().mockResolvedValue(mockTicket),
      resolveTicket: jest.fn().mockResolvedValue(mockTicket),
      closeTicket: jest.fn().mockResolvedValue(mockTicket),
      reopenTicket: jest.fn().mockResolvedValue(mockTicket),
      findCommentsByTicket: jest.fn().mockResolvedValue([]),
      createComment: jest.fn().mockResolvedValue(mockComment),
      updateComment: jest.fn().mockResolvedValue(mockComment),
      deleteComment: jest.fn().mockResolvedValue(undefined),
      findAttachmentsByTicket: jest.fn().mockResolvedValue([]),
      createAttachment: jest.fn().mockResolvedValue(mockAttachment),
      deleteAttachment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // Ticket Endpoints
  // ====================================================================

  describe('listTickets', () => {
    it('should return paginated ticket list with default query params', async () => {
      const mockResult = { data: [mockTicket], total: 1 };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.listTickets();

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        priority: undefined,
        category: undefined,
        department: undefined,
        reporter_id: undefined,
        assigned_to_id: undefined,
        event_id: undefined,
        search: undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      expect(result).toEqual({
        data: [mockTicket],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
      });
    });

    it('should pass through all query parameters', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.listTickets(
        2, 25, 'open', 'high', 'billing', 'support',
        'reporter_1', 'assigned_1', 'event_1', 'test search', 'priority', 'asc',
      );

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        status: 'open',
        priority: 'high',
        category: 'billing',
        department: 'support',
        reporter_id: 'reporter_1',
        assigned_to_id: 'assigned_1',
        event_id: 'event_1',
        search: 'test search',
        sort_by: 'priority',
        sort_order: 'asc',
      });
    });

    it('should calculate total_pages correctly', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 25 });

      const result = await controller.listTickets(1, 10);

      expect(result.total_pages).toBe(3);
    });

    it('should return empty data when no tickets exist', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.listTickets();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.total_pages).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return ticket statistics', async () => {
      const stats = {
        total: 50,
        open: 10,
        in_progress: 15,
        resolved: 20,
        closed: 5,
      };
      mockService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(mockService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMyTickets', () => {
    it('should return tickets for the specified user ID', async () => {
      const tickets = [mockTicket];
      mockService.getMyTickets.mockResolvedValue(tickets);

      const result = await controller.getMyTickets(TEST_USER_ID);

      expect(result).toEqual(tickets);
      expect(mockService.getMyTickets).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return empty array when user has no tickets', async () => {
      mockService.getMyTickets.mockResolvedValue([]);

      const result = await controller.getMyTickets(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getAssignedTickets', () => {
    it('should return assigned tickets for the specified user ID', async () => {
      const tickets = [mockTicket];
      mockService.getAssignedTickets.mockResolvedValue(tickets);

      const result = await controller.getAssignedTickets(TEST_USER_ID);

      expect(result).toEqual(tickets);
      expect(mockService.getAssignedTickets).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return empty array when user has no assigned tickets', async () => {
      mockService.getAssignedTickets.mockResolvedValue([]);

      const result = await controller.getAssignedTickets(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getTicketsForStaff', () => {
    it('should return paginated tickets for a staff member with default params', async () => {
      const mockResult = { data: [mockTicket], total: 1 };
      mockService.getTicketsForStaff.mockResolvedValue(mockResult);
      const profileId = 'staff_profile_1';

      const result = await controller.getTicketsForStaff(profileId);

      expect(mockService.getTicketsForStaff).toHaveBeenCalledWith(profileId, {
        page: 1,
        limit: 10,
        status: undefined,
        priority: undefined,
        category: undefined,
        search: undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      expect(result).toEqual({
        data: [mockTicket],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
      });
    });

    it('should pass through query filters', async () => {
      mockService.getTicketsForStaff.mockResolvedValue({ data: [], total: 0 });

      await controller.getTicketsForStaff(
        'staff_1', 2, 20, 'open', 'high', 'billing', 'search term', 'updated_at', 'asc',
      );

      expect(mockService.getTicketsForStaff).toHaveBeenCalledWith('staff_1', {
        page: 2,
        limit: 20,
        status: 'open',
        priority: 'high',
        category: 'billing',
        search: 'search term',
        sort_by: 'updated_at',
        sort_order: 'asc',
      });
    });
  });

  describe('getByTicketNumber', () => {
    it('should return a ticket by ticket number', async () => {
      mockService.findByTicketNumber.mockResolvedValue(mockTicket);

      const result = await controller.getByTicketNumber(TEST_TICKET_NUMBER);

      expect(result).toEqual(mockTicket);
      expect(mockService.findByTicketNumber).toHaveBeenCalledWith(TEST_TICKET_NUMBER);
    });

    it('should propagate NotFoundException when ticket number not found', async () => {
      mockService.findByTicketNumber.mockRejectedValue(new Error('Ticket not found'));

      await expect(controller.getByTicketNumber('MECA-INVALID')).rejects.toThrow('Ticket not found');
    });
  });

  describe('getTicket', () => {
    it('should return a ticket by ID', async () => {
      mockService.findById.mockResolvedValue(mockTicket);

      const result = await controller.getTicket(TEST_TICKET_ID);

      expect(result).toEqual(mockTicket);
      expect(mockService.findById).toHaveBeenCalledWith(TEST_TICKET_ID);
    });

    it('should propagate NotFoundException when ticket ID not found', async () => {
      mockService.findById.mockRejectedValue(new Error('Ticket not found'));

      await expect(controller.getTicket('nonexistent')).rejects.toThrow('Ticket not found');
    });
  });

  describe('createTicket', () => {
    it('should create a ticket and return it', async () => {
      const createDto = {
        title: 'New Ticket',
        description: 'Ticket description',
        reporter_id: TEST_USER_ID,
        category: TicketCategory.GENERAL,
        department: TicketDepartment.GENERAL_SUPPORT,
        priority: TicketPriority.MEDIUM,
      };
      mockService.create.mockResolvedValue(mockTicket);

      const result = await controller.createTicket(createDto);

      expect(result).toEqual(mockTicket);
      expect(mockService.create).toHaveBeenCalledWith(createDto, undefined);
    });

    it('should pass user_membership_status separately to service', async () => {
      const createDto = {
        title: 'New Ticket',
        description: 'Ticket description',
        reporter_id: TEST_USER_ID,
        category: TicketCategory.GENERAL,
        department: TicketDepartment.GENERAL_SUPPORT,
        priority: TicketPriority.MEDIUM,
        user_membership_status: 'active',
      };
      mockService.create.mockResolvedValue(mockTicket);

      await controller.createTicket(createDto);

      expect(mockService.create).toHaveBeenCalledWith(
        {
          title: 'New Ticket',
          description: 'Ticket description',
          reporter_id: TEST_USER_ID,
          category: TicketCategory.GENERAL,
          department: TicketDepartment.GENERAL_SUPPORT,
          priority: TicketPriority.MEDIUM,
        },
        'active',
      );
    });

    it('should propagate service errors', async () => {
      mockService.create.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.createTicket({
          title: 'Fail',
          description: 'desc',
          reporter_id: 'r1',
          category: TicketCategory.GENERAL,
          department: TicketDepartment.GENERAL_SUPPORT,
          priority: TicketPriority.MEDIUM,
        }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('updateTicket', () => {
    it('should update a ticket and return it', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedTicket = { ...mockTicket, title: 'Updated Title' };
      mockService.update.mockResolvedValue(updatedTicket);

      const result = await controller.updateTicket(TEST_TICKET_ID, updateDto);

      expect(result).toEqual(updatedTicket);
      expect(mockService.update).toHaveBeenCalledWith(TEST_TICKET_ID, updateDto);
    });

    it('should propagate service errors', async () => {
      mockService.update.mockRejectedValue(new Error('Not found'));

      await expect(
        controller.updateTicket('nonexistent', { title: 'x' }),
      ).rejects.toThrow('Not found');
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.deleteTicket(TEST_TICKET_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_TICKET_ID);
    });

    it('should propagate service errors', async () => {
      mockService.delete.mockRejectedValue(new Error('Not found'));

      await expect(controller.deleteTicket('nonexistent')).rejects.toThrow('Not found');
    });
  });

  // ====================================================================
  // Ticket Status Actions
  // ====================================================================

  describe('assignTicket', () => {
    it('should assign a ticket to a user', async () => {
      const assignedTicket = { ...mockTicket, assignedTo: { id: 'assignee_1' }, status: 'in_progress' };
      mockService.assignTicket.mockResolvedValue(assignedTicket);

      const result = await controller.assignTicket(TEST_TICKET_ID, 'assignee_1');

      expect(result).toEqual(assignedTicket);
      expect(mockService.assignTicket).toHaveBeenCalledWith(TEST_TICKET_ID, 'assignee_1');
    });
  });

  describe('resolveTicket', () => {
    it('should resolve a ticket', async () => {
      const resolvedTicket = { ...mockTicket, status: 'resolved' };
      mockService.resolveTicket.mockResolvedValue(resolvedTicket);

      const result = await controller.resolveTicket(TEST_TICKET_ID);

      expect(result).toEqual(resolvedTicket);
      expect(mockService.resolveTicket).toHaveBeenCalledWith(TEST_TICKET_ID);
    });
  });

  describe('closeTicket', () => {
    it('should close a ticket', async () => {
      const closedTicket = { ...mockTicket, status: 'closed' };
      mockService.closeTicket.mockResolvedValue(closedTicket);

      const result = await controller.closeTicket(TEST_TICKET_ID);

      expect(result).toEqual(closedTicket);
      expect(mockService.closeTicket).toHaveBeenCalledWith(TEST_TICKET_ID);
    });
  });

  describe('reopenTicket', () => {
    it('should reopen a ticket', async () => {
      const reopenedTicket = { ...mockTicket, status: 'open' };
      mockService.reopenTicket.mockResolvedValue(reopenedTicket);

      const result = await controller.reopenTicket(TEST_TICKET_ID);

      expect(result).toEqual(reopenedTicket);
      expect(mockService.reopenTicket).toHaveBeenCalledWith(TEST_TICKET_ID);
    });
  });

  // ====================================================================
  // Comment Endpoints
  // ====================================================================

  describe('getComments', () => {
    it('should return comments for a ticket excluding internal ones by default', async () => {
      const comments = [mockComment];
      mockService.findCommentsByTicket.mockResolvedValue(comments);

      const result = await controller.getComments(TEST_TICKET_ID);

      expect(result).toEqual(comments);
      expect(mockService.findCommentsByTicket).toHaveBeenCalledWith(TEST_TICKET_ID, false);
    });

    it('should include internal comments when include_internal is true', async () => {
      mockService.findCommentsByTicket.mockResolvedValue([]);

      await controller.getComments(TEST_TICKET_ID, 'true');

      expect(mockService.findCommentsByTicket).toHaveBeenCalledWith(TEST_TICKET_ID, true);
    });

    it('should exclude internal comments when include_internal is any non-true value', async () => {
      mockService.findCommentsByTicket.mockResolvedValue([]);

      await controller.getComments(TEST_TICKET_ID, 'false');

      expect(mockService.findCommentsByTicket).toHaveBeenCalledWith(TEST_TICKET_ID, false);
    });
  });

  describe('createComment', () => {
    it('should create a comment on a ticket', async () => {
      const commentData = { content: 'New comment', author_id: TEST_USER_ID, is_internal: false };
      mockService.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(TEST_TICKET_ID, commentData);

      expect(result).toEqual(mockComment);
      expect(mockService.createComment).toHaveBeenCalledWith({
        content: 'New comment',
        author_id: TEST_USER_ID,
        is_internal: false,
        ticket_id: TEST_TICKET_ID,
      });
    });

    it('should propagate service errors', async () => {
      mockService.createComment.mockRejectedValue(new Error('Ticket not found'));

      await expect(
        controller.createComment('nonexistent', { content: 'test', author_id: 'a1', is_internal: false }),
      ).rejects.toThrow('Ticket not found');
    });
  });

  describe('updateComment', () => {
    it('should update a comment', async () => {
      const updateData = { content: 'Updated comment' };
      const updatedComment = { ...mockComment, content: 'Updated comment' };
      mockService.updateComment.mockResolvedValue(updatedComment);

      const result = await controller.updateComment(TEST_COMMENT_ID, updateData);

      expect(result).toEqual(updatedComment);
      expect(mockService.updateComment).toHaveBeenCalledWith(TEST_COMMENT_ID, updateData);
    });

    it('should propagate service errors', async () => {
      mockService.updateComment.mockRejectedValue(new Error('Comment not found'));

      await expect(
        controller.updateComment('nonexistent', { content: 'x' }),
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      mockService.deleteComment.mockResolvedValue(undefined);

      await controller.deleteComment(TEST_COMMENT_ID);

      expect(mockService.deleteComment).toHaveBeenCalledWith(TEST_COMMENT_ID);
    });

    it('should propagate service errors', async () => {
      mockService.deleteComment.mockRejectedValue(new Error('Comment not found'));

      await expect(controller.deleteComment('nonexistent')).rejects.toThrow('Comment not found');
    });
  });

  // ====================================================================
  // Attachment Endpoints
  // ====================================================================

  describe('getAttachments', () => {
    it('should return attachments for a ticket', async () => {
      const attachments = [mockAttachment];
      mockService.findAttachmentsByTicket.mockResolvedValue(attachments);

      const result = await controller.getAttachments(TEST_TICKET_ID);

      expect(result).toEqual(attachments);
      expect(mockService.findAttachmentsByTicket).toHaveBeenCalledWith(TEST_TICKET_ID);
    });

    it('should return empty array when no attachments exist', async () => {
      mockService.findAttachmentsByTicket.mockResolvedValue([]);

      const result = await controller.getAttachments(TEST_TICKET_ID);

      expect(result).toEqual([]);
    });
  });

  describe('createAttachment', () => {
    it('should create an attachment on a ticket', async () => {
      const attachmentData = {
        uploader_id: TEST_USER_ID,
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
      };
      mockService.createAttachment.mockResolvedValue(mockAttachment);

      const result = await controller.createAttachment(TEST_TICKET_ID, attachmentData);

      expect(result).toEqual(mockAttachment);
      expect(mockService.createAttachment).toHaveBeenCalledWith({
        ...attachmentData,
        ticket_id: TEST_TICKET_ID,
      });
    });

    it('should propagate service errors', async () => {
      mockService.createAttachment.mockRejectedValue(new Error('Upload failed'));

      await expect(
        controller.createAttachment(TEST_TICKET_ID, {
          uploader_id: 'u1',
          file_name: 'f.txt',
          file_path: '/p',
          file_size: 1,
          mime_type: 'text/plain',
        }),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete an attachment', async () => {
      mockService.deleteAttachment.mockResolvedValue(undefined);

      await controller.deleteAttachment(TEST_ATTACHMENT_ID);

      expect(mockService.deleteAttachment).toHaveBeenCalledWith(TEST_ATTACHMENT_ID);
    });

    it('should propagate service errors', async () => {
      mockService.deleteAttachment.mockRejectedValue(new Error('Attachment not found'));

      await expect(controller.deleteAttachment('nonexistent')).rejects.toThrow('Attachment not found');
    });
  });

  // ====================================================================
  // Service Error Propagation
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.listTickets()).rejects.toThrow('DB error');
    });

    it('should propagate errors from getStats', async () => {
      mockService.getStats.mockRejectedValue(new Error('Stats error'));

      await expect(controller.getStats()).rejects.toThrow('Stats error');
    });

    it('should propagate errors from assignTicket', async () => {
      mockService.assignTicket.mockRejectedValue(new Error('Assign error'));

      await expect(controller.assignTicket(TEST_TICKET_ID, 'user_1')).rejects.toThrow('Assign error');
    });

    it('should propagate errors from resolveTicket', async () => {
      mockService.resolveTicket.mockRejectedValue(new Error('Resolve error'));

      await expect(controller.resolveTicket(TEST_TICKET_ID)).rejects.toThrow('Resolve error');
    });

    it('should propagate errors from closeTicket', async () => {
      mockService.closeTicket.mockRejectedValue(new Error('Close error'));

      await expect(controller.closeTicket(TEST_TICKET_ID)).rejects.toThrow('Close error');
    });

    it('should propagate errors from reopenTicket', async () => {
      mockService.reopenTicket.mockRejectedValue(new Error('Reopen error'));

      await expect(controller.reopenTicket(TEST_TICKET_ID)).rejects.toThrow('Reopen error');
    });
  });
});
