import { Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { closeAllBotForUpCode } from "../../services/dataCoinByBitService";
import { addMessageToast } from "../../store/slices/Toast";
import { useState } from "react";
import DialogCustom from "../../components/DialogCustom";

function Dashboard() {
    const dispatch = useDispatch()
    const userData = useSelector(state => state.userDataSlice.userData)
    const [confirmOFF, setConfirmOFF] = useState(false);
    return (
        <div>
            <p>Dashboard</p>
            {userData.roleName === "SuperAdmin" && (
                <Button 
                variant="contained"
                 size="large"
                 color="error"
                 onClick={() => {
                    setConfirmOFF(true)
                }}>OFF All</Button>
            )}
            {
                confirmOFF && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setConfirmOFF(false)
                        }}
                        onSubmit={async () => {
                            const res = await closeAllBotForUpCode()
                            const { message } = res.data

                            dispatch(addMessageToast({
                                status: 200,
                                message,
                            }))
                            setConfirmOFF(false)
                        }}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Off"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to off-all?</p>
                    </DialogCustom >
                )
            }
        </div>
    );
}

export default Dashboard;