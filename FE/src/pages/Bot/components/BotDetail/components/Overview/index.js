
import ConstructionIcon from '@mui/icons-material/Construction';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import styles from "./Overview.module.scss"
import { Button, Tooltip } from '@mui/material';
import { memo, useEffect, useState } from 'react';
import EditBot from './conmponents/EditBot';
import MoveBot from './conmponents/MoveBot';
import DeleteBot from './conmponents/DeleteBot';
import { getBotByID, updateBot } from '../../../../../../services/botService';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../../../../store/slices/Toast';
import { useParams } from 'react-router-dom';

function Overview() {

    const dispatch = useDispatch();

    const { botID } = useParams()

    const [toolTipText, setToolTipText] = useState("Copy to clipboard");
    const [openEditBot, setOpenEditBot] = useState({
        isOpen: false,
        dataChange: ""
    });
    const [openMoveBot, setOpenMoveBot] = useState(false);
    const [openDeleteBot, setOpenDeleteBot] = useState(false);
    const [botData, setBotData] = useState();

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            setToolTipText("Copied")
        } catch (err) {
            alert('Lỗi copy');
        }
    }

    const setToolTipDefault = () => {
        setToolTipText("")
    }

    const handleRequestSetup = async data => {
        try {
            const res = await updateBot({
                id: botData.id,
                data: {
                    Status: "PendingApproval",
                }
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            getBotData()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Cập nhật bots lỗi!",
            }))
        }
    }

    const getBotData = () => {
        getBotByID(botID)
            .then(res => {
                const data = res.data.data;
                data && setBotData(
                    {
                        ...data,
                        id: data?._id,
                        Created: data?.Created && new Date(data?.Created).toLocaleDateString(),
                    })
            }

            )
            .catch(error => {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Lấy bots detail lỗi!",
                }))
            })
    }

    useEffect(() => {
        getBotData()
    }, []);

    useEffect(() => {

        openEditBot.dataChange && getBotData()

    }, [openEditBot]);


    return (
        <div className="flex flex-col lg:w-[50%] border-2 py-3 px-5 shadow-soft-xl rounded-2xl bg-clip-border m-auto">
            <div className="flex justify-between lg:px-52 rounded-lg py-2 items-center">
                <p className="font-bold">Bot chi tiết: </p>
                <button className='px-2 py-1 rounded-lg ml-2' style={{ background: "var(--btnSubmitColor)" }} onClick={() => {
                    setOpenEditBot(editBot => (
                        {
                            ...editBot,
                            isOpen: true,
                        }
                    ))
                }}>
                    <EditIcon className='text-white'/>
                </button>
            </div>

            <div className={styles.overviewInfo}>
           
                <div className={styles.overviewInfoList}>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Tên bots: </p>
                        <div>
                            <span>{botData?.botName}</span>
                            {botData?.botName && <Tooltip title={toolTipText} placement='top' onMouseOut={setToolTipDefault}>
                                <button className="px-1 ml-2 rounded-lg text-white" style={{ background: 'var(--btnSubmitColor)' }} onClick={() => { copyToClipboard(botData?.botName) }} >copy</button>
                            </Tooltip>}
                        </div>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>ID: </p>
                        <div>
                            <span>{botData?.id}</span>
                            {botData?.id && <Tooltip title={toolTipText} placement='top' onMouseOut={setToolTipDefault}>
                                <button className="px-1 ml-2 rounded-lg text-white" style={{ background: 'var(--btnSubmitColor)' }} onClick={() => { copyToClipboard(botData?.id) }} >copy</button>
                            </Tooltip>}
                        </div>
                    </div>
                    {botData?.telegramID &&
                        <div className={styles.overviewNotif}>
                            <div className={styles.overviewInfoListItem}>
                                <p className={styles.label}>Telegram ID: </p>
                                <div>
                                    <span>{botData?.telegramID}</span>
                                    <Tooltip title={toolTipText} placement='top' onMouseOut={setToolTipDefault}>
                                        <button className="px-1 ml-2 rounded-lg text-white" style={{ background: 'var(--btnSubmitColor)' }} onClick={() => { copyToClipboard(botData?.telegramID) }} >copy</button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>}
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Loại bot: </p>
                        <span>{botData?.botType}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Trạng thái: </p>
                        <span>{botData?.Status}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Ghi chú: </p>
                        <span>{botData?.note}</span>
                    </div>

                </div>
                {/* <div className={styles.overviewInfoList}>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Version</p>
                        <span>{botData?.Version}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Server</p>
                        <span>{botData?.Server}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Location</p>
                        <span>{botData?.Location}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Group</p>
                        <span>{botData?.Group}</span>
                    </div>
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Proxy</p>
                        <span>{botData?.Proxy}</span>
                    </div>
                </div> */}
            </div>

            {/* <div className={styles.overviewBtnAction}>
                <button
                    className={'px-3 py-2 rounded-lg text-white'}
                    style={{background:'var(--btnSubmitColor)'}}
                    onClick={() => {
                        setOpenMoveBot(true)
                    }}
                >
                    Di chuyển
                </button>
                {
                    botData?.Status === "Pending" && (
                        <>
                            <Button
                                className={styles.btn}
                                color='info'
                                size="small"
                                variant="contained"
                                startIcon={<ConstructionIcon />}
                                onClick={handleRequestSetup}
                            >
                                Request Setup
                            </Button>
                           
                        </>
                    )
                }

            </div> */}




            {openEditBot.isOpen && <EditBot
                botData={botData}
                open={openEditBot.isOpen}
                onClose={(data) => {
                    setOpenEditBot(data)
                }}
            />}

            {openMoveBot && <MoveBot
                open={openMoveBot}
                onClose={() => {
                    setOpenMoveBot(false)
                }}
            />}

            {/* {openDeleteBot && <DeleteBot
                open={openDeleteBot}
                onClose={() => {
                    setOpenDeleteBot(false)
                }}
            />} */}
        </div>
    );
}

export default memo(Overview)