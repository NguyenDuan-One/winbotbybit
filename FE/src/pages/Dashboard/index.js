import { Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { closeAllBotForUpCode } from "../../services/dataCoinByBitService";
import { addMessageToast } from "../../store/slices/Toast";

function Dashboard() {
    const dispatch = useDispatch()
    const userData = useSelector(state => state.userDataSlice.userData)
    return (
        <div>
            <p>Dashboard</p>
            {userData.roleName === "SuperAdmin" && (
                <Button variant="contained" size="large" onClick={async () => {
                    const res = await closeAllBotForUpCode()
                    const { message } = res.data

                    dispatch(addMessageToast({
                        status: 200,
                        message,
                    }))
                }}>OFF All</Button>
            )}
        </div>
    );
}

export default Dashboard;