import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CvUploadCard from './CvUploadCard'

vi.mock('../services/api', () => ({
  cvApi: {
    mine: vi.fn(),
    upload: vi.fn(),
    activate: vi.fn(),
  },
}))

import { cvApi } from '../services/api'

// Helper: trigger onChange trên hidden file input
function uploadFile(input, file) {
  fireEvent.change(input, { target: { files: [file] } })
}

function pdfFile(name = 'cv.pdf', size = 1024) {
  return new File([new Uint8Array(size).fill(37)], name, { type: 'application/pdf' })
}

function docxFile() {
  return new File(['data'], 'resume.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  cvApi.mine.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

describe('CvUploadCard – render', () => {
  it('hiển thị nút upload và placeholder khi chưa có CV', async () => {
    render(<CvUploadCard />)
    // Label chứa "+ Upload CV (PDF)"
    expect(await screen.findByText(/\+ Upload CV/i)).toBeInTheDocument()
    expect(screen.getByText(/Chưa có CV nào/i)).toBeInTheDocument()
  })

  it('hiển thị danh sách CV khi API trả về dữ liệu', async () => {
    cvApi.mine.mockResolvedValue([
      { id: 1, file_name: 'hoso.pdf', file_size: 204800, is_active: true, parse_status: 'success' },
      { id: 2, file_name: 'cv_cu.pdf', file_size: 102400, is_active: false, parse_status: 'failed' },
    ])
    render(<CvUploadCard />)
    expect(await screen.findByText('hoso.pdf')).toBeInTheDocument()
    expect(screen.getByText('cv_cu.pdf')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Đã trích xuất text')).toBeInTheDocument()
    expect(screen.getByText('Parse thất bại')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('CvUploadCard – validation', () => {
  it('hiển thị lỗi khi chọn file không phải PDF', async () => {
    render(<CvUploadCard />)
    const input = document.querySelector('input[type="file"]')
    uploadFile(input, docxFile())
    expect(await screen.findByText(/Chỉ chấp nhận file PDF/i)).toBeInTheDocument()
    expect(cvApi.upload).not.toHaveBeenCalled()
  })

  it('hiển thị lỗi khi file vượt 10 MB', async () => {
    render(<CvUploadCard />)
    const input = document.querySelector('input[type="file"]')
    uploadFile(input, pdfFile('big.pdf', 11 * 1024 * 1024))
    expect(await screen.findByText(/quá lớn/i)).toBeInTheDocument()
    expect(cvApi.upload).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

describe('CvUploadCard – upload', () => {
  it('gọi cvApi.upload khi chọn PDF hợp lệ và hiển thị thông báo thành công', async () => {
    const file = pdfFile('cv.pdf')
    cvApi.upload.mockResolvedValue({ file_name: 'cv.pdf', id: 10, parse_status: 'success' })
    cvApi.mine
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 10, file_name: 'cv.pdf', file_size: 1024, is_active: true, parse_status: 'success' },
      ])

    render(<CvUploadCard />)
    await screen.findByText(/\+ Upload CV/i) // đợi mount xong

    const input = document.querySelector('input[type="file"]')
    uploadFile(input, file)

    await waitFor(() => expect(cvApi.upload).toHaveBeenCalledWith(file))
    expect(await screen.findByText(/Upload thành công/i)).toBeInTheDocument()
  })

  it('hiển thị lỗi khi API upload thất bại', async () => {
    cvApi.upload.mockRejectedValue(new Error('Lỗi kết nối MinIO'))
    render(<CvUploadCard />)
    await screen.findByText(/\+ Upload CV/i)

    const input = document.querySelector('input[type="file"]')
    uploadFile(input, pdfFile())

    expect(await screen.findByText(/Lỗi kết nối MinIO/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Activate
// ---------------------------------------------------------------------------

describe('CvUploadCard – activate', () => {
  it('gọi cvApi.activate và reload danh sách khi nhấn nút Kích hoạt', async () => {
    cvApi.mine.mockResolvedValue([
      { id: 3, file_name: 'old.pdf', file_size: 1024, is_active: false, parse_status: 'success' },
    ])
    cvApi.activate.mockResolvedValue({ message: 'Đã kích hoạt CV', cv_id: 3 })

    render(<CvUploadCard />)
    const btn = await screen.findByRole('button', { name: /Kích hoạt/i })
    await userEvent.click(btn)

    await waitFor(() => expect(cvApi.activate).toHaveBeenCalledWith(3))
    expect(cvApi.mine).toHaveBeenCalledTimes(2)
  })
})
