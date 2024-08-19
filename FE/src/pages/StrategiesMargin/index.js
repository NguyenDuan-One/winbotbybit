import { Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";


function StrategiesMargin() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }

    return (
        <div>

            <Tabs value={location.pathname.split("/")[1]} onChange={handleChangeTab}>
                <Tab label="Spot" value="Spot"></Tab>
                <Tab label="Margin" value="Margin" ></Tab>
                <Tab label="Scanner" value="Scanner" ></Tab>
            </Tabs>
        </div>
    );
}

export default StrategiesMargin;