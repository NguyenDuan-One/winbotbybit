import React, { useState } from 'react';
import CancelIcon from '@mui/icons-material/Cancel';
import { Button, CircularProgress, Container } from "@mui/material";
import styles from "./DialogCustom.module.scss"
import clsx from "clsx";

const BottomSheetModal = ({
  open = false,
  onSubmit,
  onClose,
  reserveBtn = false,
  dialogTitle = "",
  submitBtnColor = "success",
  submitBtnText = "Submit",
  hideCloseBtn = false,
  hideActionBtn = false,
  maxWidth = "xs",
  position = "top",
  backdrop = false,
  loading = false,
  addMore = false,
  addMoreFuntion,
  height = 50,
  children
}) => {
  return (
    <div>
      {/* Bottom Sheet Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-40"
        // onClick={onClose}
        >
          <div className={'bg-white h-[' + height + '%] w-full border-solid border-spacing-6 overflow-auto border-blue-700 rounded-t-2xl pb-10'}>
            <div className='hearder bg-cyan-200 flex py-5 px-3 items-center justify-between sticky top-0 z-10'>
              <span className='text-xl font-bold'>{dialogTitle}</span>
              <CancelIcon className='text-stone-600' onClick={onClose}></CancelIcon>
            </div>
            {/* <p className="mt-4">This is a more professional bottom sheet modal.</p> */}

            <div className='mt-4 px-5'>
              {children}
              <div className='mt-3 flex justify-end'>
                {!hideActionBtn && <div className={clsx(styles.btnActive, reserveBtn && styles.reserveBtn)}>
                  {!hideCloseBtn && <Button
                    variant="contained"
                    color="inherit"
                    style={{
                      margin: reserveBtn ? "0 0 0 12px" : "0 12px 0 0"
                    }}
                    onClick={onClose}
                  >Hủy</Button>}
                  {addMore && <Button
                    variant="contained"
                    color="info"
                    style={{
                      marginRight: "12px"
                    }}
                    onClick={addMoreFuntion}
                  >Add More</Button>}
                  {
                    !loading ?
                      <Button variant="contained" color={submitBtnColor} onClick={() => {
                        onSubmit()
                        // onClose()
                      }}>{submitBtnText}</Button>
                      :
                      <CircularProgress style={{
                        width: "32px",
                        height: "32px",
                        color: "#2e75db",
                        marginRight: "12px"
                      }} color='inherit' />
                  }
                </div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomSheetModal;