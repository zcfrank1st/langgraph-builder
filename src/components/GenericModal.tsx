import { Modal as MuiModal, ModalDialog, Button } from '@mui/joy'
import Image from 'next/image'

interface GenericModalProps {
  isOpen?: boolean
  onClose: () => void
  title: string
  content: string | React.ReactNode
  buttonText: string
  onButtonClick?: () => void
  hideBackDrop?: boolean
  className?: string
  noClickThrough?: boolean
  imageUrl?: string
}

const GenericModal = ({
  isOpen = true,
  onClose,
  title,
  content,
  buttonText,
  onButtonClick,
  hideBackDrop = false,
  className = '',
  noClickThrough = false,
  imageUrl,
}: GenericModalProps) => (
  <MuiModal
    sx={{
      pointerEvents: noClickThrough ? 'auto' : 'none',
    }}
    hideBackdrop={hideBackDrop}
    open={isOpen}
  >
    <ModalDialog
      sx={{
        pointerEvents: 'auto',
        zIndex: 50,
      }}
      className={`${className}`}
    >
      <div className='text-center text-lg font-medium md:hidden'>
        <div className={`flex justify-center ${imageUrl ? 'mb-6' : ''}`}>
          {imageUrl && <Image src={imageUrl} alt='Modal Image' width={150} height={150} />}
        </div>
        Please view the LangGraph builder on desktop
      </div>
      <div className='flex hidden md:block flex-col justify-center items-center text-center'>
        <div className={`flex justify-center ${imageUrl ? 'mb-6' : ''}`}>
          {imageUrl && <Image src={imageUrl} alt='Modal Image' width={150} height={150} />}
        </div>
        <div className={`text-2xl font-medium`}>{title}</div>
        <div className={`text-lg text-gray-500 pt-2 text-center ${imageUrl ? 'max-w-lg' : 'max-w-md'}`}>{content}</div>

        <Button
          onClick={onButtonClick || onClose}
          className={`bg-[#076699] hover:bg-[#06578a] ${imageUrl ? 'mt-6' : 'mt-3'}`}
        >
          {buttonText}
        </Button>
      </div>
    </ModalDialog>
  </MuiModal>
)

export default GenericModal
