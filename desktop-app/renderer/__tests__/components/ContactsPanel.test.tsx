import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactsPanel from '../../src/components/ContactsPanel';
import * as localApi from '../../src/api/localApi';

// Mock localApi
jest.mock('../../src/api/localApi');

const mockedLocalApi = localApi as jest.Mocked<typeof localApi>;

describe('ContactsPanel', () => {
  const mockAccountId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CON-001: View all contacts', () => {
    it('should display contact list with avatar, name, userId, phone', async () => {
      const mockContacts = [
        {
          id: 1,
          accountId: 1,
          userId: 'user123',
          displayName: 'Nguyen Van A',
          phoneNumber: '0123456789',
          avatar: 'https://example.com/avatar.jpg',
        },
        {
          id: 2,
          accountId: 1,
          userId: 'user456',
          displayName: 'Tran Thi B',
          phoneNumber: '0987654321',
        },
      ];

      mockedLocalApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockContacts,
          total: 2,
        },
      });

      mockedLocalApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
        },
      });

      render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
        expect(screen.getByText('user123')).toBeInTheDocument();
        expect(screen.getByText('0123456789')).toBeInTheDocument();
        expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
      });
    });
  });

  describe('CON-002: Empty contacts', () => {
    it('should show empty state message when no contacts exist', async () => {
      mockedLocalApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
          total: 0,
        },
      });

      mockedLocalApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
        },
      });

      render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Chưa có contact nào. Nhấn "Thêm Contact" để tạo mới/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('FIL-001: Search by name', () => {
    it('should filter contacts when searching by name', async () => {
      const allContacts = [
        { id: 1, userId: 'u1', displayName: 'Nguyen Van A', accountId: 1 },
        { id: 2, userId: 'u2', displayName: 'Tran Thi B', accountId: 1 },
      ];

      const filteredContacts = [
        { id: 1, userId: 'u1', displayName: 'Nguyen Van A', accountId: 1 },
      ];

      // Initial load
      mockedLocalApi.get.mockResolvedValueOnce({
        data: { success: true, data: allContacts, total: 2 },
      });

      mockedLocalApi.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      const { rerender } = render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
        expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
      });

      // Search
      const searchInput = screen.getByPlaceholderText(/Tìm theo tên, User ID, số điện thoại/i);
      fireEvent.change(searchInput, { target: { value: 'Nguyen' } });

      mockedLocalApi.get.mockResolvedValueOnce({
        data: { success: true, data: filteredContacts, total: 1 },
      });

      const searchButton = screen.getByRole('button', { name: /Tìm kiếm/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
        expect(screen.queryByText('Tran Thi B')).not.toBeInTheDocument();
      });
    });
  });

  describe('CRU-001: Create contact', () => {
    it('should create contact when form is submitted with valid data', async () => {
      mockedLocalApi.get.mockResolvedValue({
        data: { success: true, data: [], total: 0 },
      });

      mockedLocalApi.post.mockResolvedValueOnce({
        data: { success: true },
      });

      render(<ContactsPanel accountId={mockAccountId} />);

      // Open create dialog
      const addButton = await screen.findByRole('button', { name: /Thêm Contact/i });
      fireEvent.click(addButton);

      // Fill form
      const userIdInput = screen.getByLabelText(/User ID/i);
      const displayNameInput = screen.getByLabelText(/Tên hiển thị/i);

      fireEvent.change(userIdInput, { target: { value: 'newuser123' } });
      fireEvent.change(displayNameInput, { target: { value: 'New User' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /^Thêm$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedLocalApi.post).toHaveBeenCalledWith('/local/contacts', {
          accountId: mockAccountId,
          userId: 'newuser123',
          displayName: 'New User',
          phoneNumber: undefined,
          avatar: undefined,
        });
      });
    });
  });

  describe('CRU-007: Delete single contact', () => {
    it('should delete contact when confirmed', async () => {
      const mockContacts = [
        { id: 1, userId: 'user123', displayName: 'Test User', accountId: 1 },
      ];

      mockedLocalApi.get.mockResolvedValue({
        data: { success: true, data: mockContacts, total: 1 },
      });

      mockedLocalApi.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Open context menu
      const moreButton = screen.getByRole('button', { name: '' }); // MoreVert button
      fireEvent.click(moreButton);

      // Click delete
      const deleteButton = await screen.findByText(/Xóa/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Bạn có chắc muốn xóa contact này?');
        expect(mockedLocalApi.delete).toHaveBeenCalledWith('/local/contacts/1');
      });
    });
  });

  describe('BLK-003: Bulk delete', () => {
    it('should delete multiple contacts when bulk delete is confirmed', async () => {
      const mockContacts = [
        { id: 1, userId: 'u1', displayName: 'User 1', accountId: 1 },
        { id: 2, userId: 'u2', displayName: 'User 2', accountId: 1 },
        { id: 3, userId: 'u3', displayName: 'User 3', accountId: 1 },
      ];

      mockedLocalApi.get.mockResolvedValue({
        data: { success: true, data: mockContacts, total: 3 },
      });

      mockedLocalApi.post.mockResolvedValueOnce({
        data: { success: true },
      });

      global.confirm = jest.fn(() => true);

      render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      // Select contacts
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First contact
      fireEvent.click(checkboxes[2]); // Second contact

      // Click bulk delete
      const bulkDeleteButton = await screen.findByRole('button', { name: /Xóa/i });
      fireEvent.click(bulkDeleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Bạn có chắc muốn xóa 2 contacts?');
        expect(mockedLocalApi.post).toHaveBeenCalledWith('/local/contacts/bulk-delete', {
          ids: [1, 2],
        });
      });
    });
  });

  describe('IMP-004: Import valid CSV', () => {
    it('should import contacts from valid CSV file', async () => {
      mockedLocalApi.get.mockResolvedValue({
        data: { success: true, data: [], total: 0 },
      });

      mockedLocalApi.post.mockResolvedValue({
        data: { success: true },
      });

      render(<ContactsPanel accountId={mockAccountId} />);

      const csvContent = `User ID,Tên hiển thị,Số điện thoại,Avatar URL
"user1","User One","0123456789",""
"user2","User Two","0987654321",""`;

      const file = new File([csvContent], 'contacts.csv', { type: 'text/csv' });

      const input = screen.getByLabelText(/Nhập CSV/i).previousElementSibling as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(
        () => {
          expect(mockedLocalApi.post).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockedLocalApi.get.mockRejectedValueOnce(new Error('Network error'));

      mockedLocalApi.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      render(<ContactsPanel accountId={mockAccountId} />);

      await waitFor(() => {
        expect(screen.getByText(/Đã xảy ra lỗi khi tải danh bạ/i)).toBeInTheDocument();
      });
    });
  });
});
