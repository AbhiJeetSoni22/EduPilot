import { Request, Response } from 'express';
import { AcademicCalendar } from '../models/academic-calendar.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getCalendarEvents(req: Request, res: Response): Promise<void> {
  try {
    const { academicYear, semester, eventType, isHoliday, targetAudience, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (eventType) filter.eventType = eventType;
    if (isHoliday !== undefined) filter.isHoliday = isHoliday === 'true';
    if (targetAudience) filter.targetAudience = targetAudience;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const events = await AcademicCalendar.find(filter)
      .populate('department', 'name code')
      .sort({ startDate: 1 });

    sendSuccess(res, events, 'Academic calendar events retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch calendar events';
    sendError(res, errMessage, 500);
  }
}

export async function getCalendarEventById(req: Request, res: Response): Promise<void> {
  try {
    const event = await AcademicCalendar.findById(req.params.id).populate(
      'department',
      'name code'
    );
    if (!event) {
      sendError(res, 'Calendar event not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, event);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch calendar event';
    sendError(res, errMessage, 500);
  }
}

export async function createCalendarEvent(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      academicYear,
      semester,
      eventType,
      startDate,
      endDate,
      description,
      isHoliday,
      targetAudience,
      department,
    } = req.body;

    if (!title || !eventType || !startDate || !endDate) {
      sendError(res, 'Title, event type, start date, and end date are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const event = new AcademicCalendar({
      title: title.trim(),
      academicYear: academicYear || '2025-26',
      semester: semester || 'All',
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description?.trim() || '',
      isHoliday: Boolean(isHoliday),
      targetAudience: targetAudience || 'All',
      department: department || null,
    });

    await event.save();
    const populated = await AcademicCalendar.findById(event._id).populate('department', 'name code');
    sendSuccess(res, populated, 'Calendar event created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create calendar event';
    sendError(res, errMessage, 500);
  }
}

export async function updateCalendarEvent(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      academicYear,
      semester,
      eventType,
      startDate,
      endDate,
      description,
      isHoliday,
      targetAudience,
      department,
    } = req.body;

    const event = await AcademicCalendar.findById(req.params.id);
    if (!event) {
      sendError(res, 'Calendar event not found', 404, 'NOT_FOUND');
      return;
    }

    if (title) event.title = title.trim();
    if (academicYear) event.academicYear = academicYear;
    if (semester) event.semester = semester;
    if (eventType) event.eventType = eventType;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (description !== undefined) event.description = description.trim();
    if (isHoliday !== undefined) event.isHoliday = Boolean(isHoliday);
    if (targetAudience) event.targetAudience = targetAudience;
    if (department !== undefined) event.department = department || null;

    await event.save();
    const populated = await AcademicCalendar.findById(event._id).populate('department', 'name code');
    sendSuccess(res, populated, 'Calendar event updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update calendar event';
    sendError(res, errMessage, 500);
  }
}

export async function deleteCalendarEvent(req: Request, res: Response): Promise<void> {
  try {
    const event = await AcademicCalendar.findByIdAndDelete(req.params.id);
    if (!event) {
      sendError(res, 'Calendar event not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Calendar event deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete calendar event';
    sendError(res, errMessage, 500);
  }
}
