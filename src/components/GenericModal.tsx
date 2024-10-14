import { Modal as MuiModal, ModalDialog, Button } from "@mui/joy";
import Image from "next/image";

interface GenericModalProps {
    isOpen: boolean;
    onClose: () => void; 
    title: string;
    content: any;
    buttonText: string;
    onButtonClick?: () => void;
    hideBackDrop?: boolean;
    className?: string;
    noClickThrough?: boolean;
    imageUrl?: string;
  }

const GenericModal = ({ isOpen, onClose, title, content, buttonText, onButtonClick, hideBackDrop = false, className = '', noClickThrough = false, imageUrl }: GenericModalProps) => (
  <MuiModal sx={{
    pointerEvents: noClickThrough ? 'auto' : 'none',
  }} hideBackdrop={hideBackDrop} open={isOpen}>
    <ModalDialog sx={{
        pointerEvents: 'auto',
        zIndex: 50,
      }} className={`${className}`}>
      <div className="flex flex-col text-center">
        <div className="flex justify-center">
        {imageUrl && (
          <Image src={imageUrl} alt="Modal Image" width={200} height={200} />
        )}
        </div>
        <div className={`text-2xl font-medium ${imageUrl ? 'mt-3' : ''}`}>{title}</div>
        <div className="text-lg text-gray-500 pt-2">{content}</div>
        <Button onClick={onButtonClick || onClose} className="bg-[#246161] hover:bg-[#195656] mt-4">
          {buttonText}
        </Button>
      </div>
    </ModalDialog>
  </MuiModal>
);

export default GenericModal;




